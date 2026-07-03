import type { Env } from '../types/env'
import { createDb } from '../db'
import { schema } from '../db'
import { requireAuth } from '../middleware/auth'
import { ok, created, error } from '../utils/response'
import { progressRecordSchema } from '@nutripro/shared'
import { generateId } from '../services/hashService'
import { eq, desc, and } from 'drizzle-orm'
import { syncProgressToProfileAndQuestionnaire, syncWeightFromLatestProgress } from '../services/syncService'

export async function handleProgress(request: Request, env: Env, path: string): Promise<Response> {
  const db = createDb(env.DB)
  const method = request.method

  if (path === '/' && method === 'GET') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult

    // Verificar plan si el usuario no es admin
    if (authResult.auth.role !== 'admin') {
      const profile = await db.select().from(schema.profiles)
        .where(eq(schema.profiles.userId, authResult.auth.userId))
        .get()
      if (!profile || (profile.plan !== 'pro' && profile.plan !== 'elite')) {
        return error('Acceso denegado: este apartado requiere el plan Pro o Elite.', 403)
      }
    }

    const url = new URL(request.url)
    const userId = authResult.auth.role === 'admin'
      ? (url.searchParams.get('userId') ?? authResult.auth.userId)
      : authResult.auth.userId
    const records = await db.select().from(schema.progressRecords)
      .where(eq(schema.progressRecords.userId, userId))
      .orderBy(desc(schema.progressRecords.recordedAt))
      .all()
    return ok(records)
  }

  if (path === '/' && method === 'POST') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult

    // Verificar plan
    if (authResult.auth.role !== 'admin') {
      const profile = await db.select().from(schema.profiles)
        .where(eq(schema.profiles.userId, authResult.auth.userId))
        .get()
      if (!profile || (profile.plan !== 'pro' && profile.plan !== 'elite')) {
        return error('Acceso denegado: este apartado requiere el plan Pro o Elite.', 403)
      }
    }

    const body = await request.json().catch(() => ({}))
    const parsed = progressRecordSchema.safeParse(body)
    if (!parsed.success) return error(parsed.error.errors[0]?.message ?? 'Datos inválidos', 422)

    // Verificar si ya existe registro para la fecha indicada (max 1 vez al día)
    const existing = await db.select().from(schema.progressRecords)
      .where(
        and(
          eq(schema.progressRecords.userId, authResult.auth.userId),
          eq(schema.progressRecords.recordedAt, parsed.data.recordedAt)
        )
      )
      .get()
    if (existing) {
      return error('Ya has registrado tu progreso para la fecha indicada.', 400)
    }

    const id = generateId()
    await db.insert(schema.progressRecords).values({ id, userId: authResult.auth.userId, ...parsed.data, createdAt: new Date().toISOString() })
    
    // Sync progress weight update to profile and latest questionnaire
    if (parsed.data.weight !== undefined && parsed.data.weight !== null) {
      await syncProgressToProfileAndQuestionnaire(db, authResult.auth.userId, parsed.data.weight)
    }

    const record = await db.select().from(schema.progressRecords).where(eq(schema.progressRecords.id, id)).get()
    return created(record)
  }

  if (path.match(/^\/[a-f0-9-]{36}$/) && method === 'DELETE') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult
    const id = path.slice(1)
    const record = await db.select().from(schema.progressRecords).where(eq(schema.progressRecords.id, id)).get()
    if (!record) return error('No encontrado', 404)
    if (record.userId !== authResult.auth.userId && authResult.auth.role !== 'admin') return error('Acceso denegado', 403)
    await db.delete(schema.progressRecords).where(eq(schema.progressRecords.id, id))
    
    // Sync weight from the next latest progress log (or revert to questionnaire weight)
    await syncWeightFromLatestProgress(db, record.userId)

    return ok({ message: 'Registro eliminado' })
  }

  return error('Ruta no encontrada', 404)
}
