import type { Env } from '../types/env'
import { createDb } from '../db'
import { schema } from '../db'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { ok, created, error, notFound } from '../utils/response'
import { questionnaireSchema } from '@nutripro/shared'
import { generateId } from '../services/hashService'
import { EmailService } from '../services/emailService'
import { eq, desc } from 'drizzle-orm'
import { syncQuestionnaireToProfile } from '../services/syncService'

export async function handleQuestionnaires(request: Request, env: Env, path: string): Promise<Response> {
  const db = createDb(env.DB)
  const emailService = new EmailService(env.BREVO_API_KEY)
  const method = request.method

  if (path === '/' && method === 'GET') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult
    if (authResult.auth.role === 'admin') {
      const items = await db.select({
        id: schema.questionnaires.id,
        userId: schema.questionnaires.userId,
        objectives: schema.questionnaires.objectives,
        submittedAt: schema.questionnaires.submittedAt,
        firstName: schema.profiles.firstName,
        lastName: schema.profiles.lastName,
        email: schema.users.email,
      }).from(schema.questionnaires)
        .leftJoin(schema.profiles, eq(schema.questionnaires.userId, schema.profiles.userId))
        .leftJoin(schema.users, eq(schema.questionnaires.userId, schema.users.id))
        .orderBy(desc(schema.questionnaires.submittedAt))
        .all()
      return ok(items)
    } else {
      const items = await db.select().from(schema.questionnaires)
        .where(eq(schema.questionnaires.userId, authResult.auth.userId))
        .orderBy(desc(schema.questionnaires.submittedAt))
        .all()
      return ok(items)
    }
  }

  if (path === '/' && method === 'POST') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult
    const body = await request.json().catch(() => ({}))
    const parsed = questionnaireSchema.safeParse(body)
    if (!parsed.success) return error(parsed.error.errors[0]?.message ?? 'Datos inválidos', 422)
    const id = generateId()
    const now = new Date().toISOString()
    await db.insert(schema.questionnaires).values({ id, userId: authResult.auth.userId, ...parsed.data, submittedAt: now, createdAt: now, updatedAt: now })
    
    // Sync questionnaire responses to user profile (and progress weight logs)
    await syncQuestionnaireToProfile(db, authResult.auth.userId, {
      objectives: parsed.data.objectives,
      restrictions: parsed.data.restrictions,
      observations: parsed.data.observations ?? null
    })

    const profile = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, authResult.auth.userId)).get()
    const user = await db.select().from(schema.users).where(eq(schema.users.id, authResult.auth.userId)).get()
    const admin = await db.select().from(schema.users).where(eq(schema.users.role, 'admin')).get()
    if (admin) {
      await emailService.sendNewQuestionnaire(
        admin.email,
        `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim(),
        user?.email ?? '',
        env.APP_URL
      )
    }
    const record = await db.select().from(schema.questionnaires).where(eq(schema.questionnaires.id, id)).get()
    return created(record)
  }

  if (path.match(/^\/[a-f0-9-]{36}$/) && method === 'GET') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult
    const id = path.slice(1)
    const record = await db.select().from(schema.questionnaires).where(eq(schema.questionnaires.id, id)).get()
    if (!record) return notFound()
    if (authResult.auth.role !== 'admin' && record.userId !== authResult.auth.userId) return error('Acceso denegado', 403)
    return ok(record)
  }

  return error('Ruta no encontrada', 404)
}
