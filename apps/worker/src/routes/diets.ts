import type { Env } from '../types/env'
import { createDb } from '../db'
import { schema } from '../db'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { ok, created, error, notFound, forbidden } from '../utils/response'
import { dietSchema } from '@nutripro/shared'
import { generateId } from '../services/hashService'
import { eq, and, desc } from 'drizzle-orm'
import { AiService } from '../services/aiService'

export async function handleDiets(request: Request, env: Env, path: string): Promise<Response> {
  const db = createDb(env.DB)
  const method = request.method

  // GET /diets — list own diets (client) or all (admin)
  if (path === '/' && method === 'GET') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult

    const url = new URL(request.url)
    const queryUserId = url.searchParams.get('userId')
    
    let items;
    if (authResult.auth.role === 'admin') {
      if (queryUserId) {
        items = await db.select().from(schema.diets).where(eq(schema.diets.userId, queryUserId)).orderBy(desc(schema.diets.assignedAt)).all()
      } else {
        items = await db.select().from(schema.diets).orderBy(desc(schema.diets.assignedAt)).all()
      }
    } else {
      items = await db.select().from(schema.diets).where(eq(schema.diets.userId, authResult.auth.userId)).orderBy(desc(schema.diets.assignedAt)).all()
    }

    return ok(items)
  }

  // GET /diets/active — get active diet (client)
  if (path === '/active' && method === 'GET') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult

    const diet = await db
      .select()
      .from(schema.diets)
      .where(and(eq(schema.diets.userId, authResult.auth.userId), eq(schema.diets.status, 'active')))
      .orderBy(desc(schema.diets.assignedAt))
      .get()

    return ok(diet ?? null)
  }

  // GET /diets/:id
  if (path.match(/^\/[a-f0-9-]{36}$/) && method === 'GET') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult

    const id = path.slice(1)
    const diet = await db.select().from(schema.diets).where(eq(schema.diets.id, id)).get()
    if (!diet) return notFound('Dieta no encontrada')

    if (authResult.auth.role !== 'admin' && diet.userId !== authResult.auth.userId) {
      return forbidden()
    }
    return ok(diet)
  }

  // POST /diets — create (admin only)
  if (path === '/' && method === 'POST') {
    const authResult = await requireAdmin(request, env)
    if (authResult instanceof Response) return authResult

    const body = await request.json().catch(() => ({}))
    const parsed = dietSchema.safeParse(body)
    if (!parsed.success) return error(parsed.error.errors[0]?.message ?? 'Datos inválidos', 422)

    // Archive previous active diets for this user
    if (parsed.data.status === 'active') {
      await db
        .update(schema.diets)
        .set({ status: 'archived', updatedAt: new Date().toISOString() })
        .where(and(eq(schema.diets.userId, parsed.data.userId), eq(schema.diets.status, 'active')))
    }

    const id = generateId()
    const now = new Date().toISOString()
    await db.insert(schema.diets).values({ id, ...parsed.data, assignedAt: now, createdAt: now, updatedAt: now })

    const diet = await db.select().from(schema.diets).where(eq(schema.diets.id, id)).get()
    return created(diet)
  }

  // POST /diets/generate-ai — generate via Groq AI (admin only)
  if (path === '/generate-ai' && method === 'POST') {
    const authResult = await requireAdmin(request, env)
    if (authResult instanceof Response) return authResult

    const body: any = await request.json().catch(() => ({}))
    const { userId } = body
    if (!userId) return error('El userId es obligatorio', 400)

    // Fetch all needed data in parallel
    const [questionnaire, profile, allDiets, progressHistory, weeklyCheckins] = await Promise.all([
      db.select().from(schema.questionnaires)
        .where(eq(schema.questionnaires.userId, userId))
        .orderBy(desc(schema.questionnaires.submittedAt))
        .get().then(r => r ?? null),
      db.select().from(schema.profiles)
        .where(eq(schema.profiles.userId, userId))
        .get().then(r => r ?? { firstName: 'Cliente', lastName: '', gender: null, height: null, weight: null, birthDate: null, allergies: null, observations: null }),
      db.select().from(schema.diets)
        .where(eq(schema.diets.userId, userId))
        .orderBy(desc(schema.diets.assignedAt))
        .all(),
      db.select().from(schema.progressRecords)
        .where(eq(schema.progressRecords.userId, userId))
        .orderBy(desc(schema.progressRecords.recordedAt))
        .limit(12)
        .all(),
      db.select().from(schema.weeklyCheckins)
        .where(eq(schema.weeklyCheckins.userId, userId))
        .orderBy(desc(schema.weeklyCheckins.weekLabel))
        .limit(6)
        .all(),
    ])

    // Calculate clinical phase from the earliest assigned diet
    const sortedDiets = [...allDiets].sort((a, b) => a.assignedAt.localeCompare(b.assignedAt))
    const firstDietDate = sortedDiets[0]?.assignedAt ? new Date(sortedDiets[0].assignedAt) : null
    const weeksSinceStart = firstDietDate
      ? Math.floor((Date.now() - firstDietDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
      : 0
    const currentDietNumber = allDiets.filter(d => d.status === 'archived').length + 1
    const currentPhase = weeksSinceStart <= 4 ? 'adaptacion'
      : weeksSinceStart <= 8 ? 'progresion'
      : 'mantenimiento'
    const allDietTitles = sortedDiets.map(d => d.title).filter(Boolean)

    try {
      const aiService = new AiService(env.GROQ_API_KEY)
      const generated = await aiService.generateDiet(profile, questionnaire, {
        progressHistory,
        weeklyCheckins,
        currentDietNumber,
        currentPhase,
        weeksSinceStart,
        allDietTitles,
      })

      const content = JSON.stringify({
        version: 2,
        weeklyPlan: generated.weeklyPlan,
        notes: generated.notes ?? '',
      })

      // Delete any previous unconfirmed draft diets for this user
      await db
        .delete(schema.diets)
        .where(and(eq(schema.diets.userId, userId), eq(schema.diets.status, 'draft')))

      const id = generateId()
      const now = new Date().toISOString()
      const rawTitle = generated.title || 'Dieta Personalizada con IA'
      const title = rawTitle.startsWith('Borrador:') ? rawTitle : `Borrador: ${rawTitle}`

      await db.insert(schema.diets).values({
        id,
        userId,
        title,
        description: generated.description || null,
        content,
        totalCalories: generated.totalCalories || null,
        status: 'draft',
        assignedAt: now,
        createdAt: now,
        updatedAt: now,
      })

      const diet = await db.select().from(schema.diets).where(eq(schema.diets.id, id)).get()
      return created(diet)
    } catch (err: any) {
      return error(err.message || 'Error al generar la dieta con IA', 500)
    }
  }


  // POST /diets/recalculate-macros — recalculate macros for specific meals (admin only)
  if (path === '/recalculate-macros' && method === 'POST') {
    const authResult = await requireAdmin(request, env)
    if (authResult instanceof Response) return authResult

    const body: any = await request.json().catch(() => ({}))
    const { meals } = body
    if (!Array.isArray(meals)) return error('La lista de comidas es obligatoria', 400)
    if (meals.length === 0) return ok({ meals: [] })

    try {
      const aiService = new AiService(env.GROQ_API_KEY)
      const calculated = await aiService.calculateMacros(meals)
      return ok(calculated)
    } catch (err: any) {
      return error(err.message || 'Error al recalcular los macros', 500)
    }
  }

  // PUT /diets/:id — update (admin only)
  if (path.match(/^\/[a-f0-9-]{36}$/) && method === 'PUT') {
    const authResult = await requireAdmin(request, env)
    if (authResult instanceof Response) return authResult

    const id = path.slice(1)
    try {
      const body = await request.json().catch(() => ({}))
      const parsed = dietSchema.partial().safeParse(body)
      if (!parsed.success) return error(parsed.error.errors[0]?.message ?? 'Datos inválidos', 422)

      const now = new Date().toISOString()
      const existing = await db.select().from(schema.diets).where(eq(schema.diets.id, id)).get()
      if (!existing) return notFound('Dieta no encontrada')

      if (parsed.data.status === 'active') {
        await db.update(schema.diets)
          .set({ status: 'archived', updatedAt: now })
          .where(and(eq(schema.diets.userId, existing.userId), eq(schema.diets.status, 'active')))
      }

      await db
        .update(schema.diets)
        .set({ ...parsed.data, updatedAt: now })
        .where(eq(schema.diets.id, id))

      const diet = await db.select().from(schema.diets).where(eq(schema.diets.id, id)).get()
      return ok(diet)
    } catch (err: any) {
      return error(err.message || 'Error interno al actualizar la dieta', 500)
    }
  }

  // DELETE /diets/:id — delete (admin only)
  if (path.match(/^\/[a-f0-9-]{36}$/) && method === 'DELETE') {
    const authResult = await requireAdmin(request, env)
    if (authResult instanceof Response) return authResult

    const id = path.slice(1)
    await db.delete(schema.diets).where(eq(schema.diets.id, id))
    return ok({ message: 'Dieta eliminada' })
  }

  return error('Ruta no encontrada', 404)
}
