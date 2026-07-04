import type { Env } from '../types/env'
import { createDb } from '../db'
import { schema } from '../db'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { ok, created, error, notFound, forbidden } from '../utils/response'
import { workoutSchema, workoutExerciseSchema } from '@nutripro/shared'
import { generateId } from '../services/hashService'
import { eq, and, desc } from 'drizzle-orm'
import { AiService } from '../services/aiService'

export async function handleWorkouts(request: Request, env: Env, path: string): Promise<Response> {
  const db = createDb(env.DB)
  const method = request.method

  if (path === '/' && method === 'GET') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult
    const url = new URL(request.url)
    const queryUserId = url.searchParams.get('userId')
    
    let items;
    if (authResult.auth.role === 'admin') {
      if (queryUserId) {
        items = await db.select().from(schema.workouts).where(eq(schema.workouts.userId, queryUserId)).orderBy(desc(schema.workouts.assignedAt)).all()
      } else {
        items = await db.select().from(schema.workouts).orderBy(desc(schema.workouts.assignedAt)).all()
      }
    } else {
      items = await db.select().from(schema.workouts).where(eq(schema.workouts.userId, authResult.auth.userId)).orderBy(desc(schema.workouts.assignedAt)).all()
    }
    return ok(items)
  }

  if (path === '/active' && method === 'GET') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult
    const url = new URL(request.url)
    const userId = authResult.auth.role === 'admin'
      ? (url.searchParams.get('userId') ?? authResult.auth.userId)
      : authResult.auth.userId
    const workout = await db.select().from(schema.workouts).where(and(eq(schema.workouts.userId, userId), eq(schema.workouts.status, 'active'))).orderBy(desc(schema.workouts.assignedAt)).get()
    if (!workout) return ok(null)
    const exercises = await db.select().from(schema.workoutExercises).where(eq(schema.workoutExercises.workoutId, workout.id)).all()
    return ok({ ...workout, exercises })
  }

  if (path.match(/^\/[a-f0-9-]{36}$/) && method === 'GET') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult
    const id = path.slice(1)
    const workout = await db.select().from(schema.workouts).where(eq(schema.workouts.id, id)).get()
    if (!workout) return notFound()
    if (authResult.auth.role !== 'admin' && workout.userId !== authResult.auth.userId) return forbidden()
    const exercises = await db.select().from(schema.workoutExercises).where(eq(schema.workoutExercises.workoutId, id)).all()
    return ok({ ...workout, exercises })
  }

  if (path === '/' && method === 'POST') {
    const authResult = await requireAdmin(request, env)
    if (authResult instanceof Response) return authResult
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const parsed = workoutSchema.safeParse(body)
    if (!parsed.success) return error(parsed.error.errors[0]?.message ?? 'Datos inválidos', 422)
    const { exercises, ...workoutData } = parsed.data
    if (workoutData.status === 'active') {
      await db.update(schema.workouts).set({ status: 'archived', updatedAt: new Date().toISOString() })
        .where(and(eq(schema.workouts.userId, workoutData.userId), eq(schema.workouts.status, 'active')))
    }
    const id = generateId()
    const now = new Date().toISOString()
    await db.insert(schema.workouts).values({ id, ...workoutData, assignedAt: now, createdAt: now, updatedAt: now })
    for (const ex of exercises) {
      await db.insert(schema.workoutExercises).values({ id: generateId(), workoutId: id, ...ex })
    }
    const workout = await db.select().from(schema.workouts).where(eq(schema.workouts.id, id)).get()
    return created(workout)
  }

  // POST /workouts/generate-ai — generate via Groq AI (admin only)
  if (path === '/generate-ai' && method === 'POST') {
    const authResult = await requireAdmin(request, env)
    if (authResult instanceof Response) return authResult

    const body: any = await request.json().catch(() => ({}))
    const { userId } = body
    if (!userId) return error('El userId es obligatorio', 400)

    // Fetch all needed data in parallel
    const [questionnaire, profile, allWorkouts, allDiets, progressHistory, weeklyCheckins] = await Promise.all([
      db.select().from(schema.questionnaires)
        .where(eq(schema.questionnaires.userId, userId))
        .orderBy(desc(schema.questionnaires.submittedAt))
        .get().then(r => r ?? null),
      db.select().from(schema.profiles)
        .where(eq(schema.profiles.userId, userId))
        .get().then(r => r ?? { firstName: 'Cliente', lastName: '', gender: null, height: null, weight: null, birthDate: null, allergies: null, observations: null }),
      db.select().from(schema.workouts)
        .where(eq(schema.workouts.userId, userId))
        .orderBy(desc(schema.workouts.assignedAt))
        .all(),
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
    const currentPhase = weeksSinceStart <= 4 ? 'adaptacion'
      : weeksSinceStart <= 8 ? 'progresion'
      : 'mantenimiento'
    const sortedWorkouts = [...allWorkouts].sort((a, b) => a.assignedAt.localeCompare(b.assignedAt))
    const allWorkoutTitles = sortedWorkouts.map(w => w.title).filter(Boolean)

    try {
      const aiService = new AiService(env.GROQ_API_KEY)
      const generated = await aiService.generateWorkout(profile, questionnaire, {
        progressHistory,
        weeklyCheckins,
        currentPhase,
        weeksSinceStart,
        allWorkoutTitles,
      })

      // Delete any previous unconfirmed draft workouts for this user (exercises will cascade delete)
      await db
        .delete(schema.workouts)
        .where(and(eq(schema.workouts.userId, userId), eq(schema.workouts.status, 'draft')))

      const workoutId = generateId()
      const now = new Date().toISOString()
      const rawTitle = generated.title || 'Rutina Personalizada con IA'
      const title = rawTitle.startsWith('Borrador:') ? rawTitle : `Borrador: ${rawTitle}`

      await db.insert(schema.workouts).values({
        id: workoutId,
        userId,
        title,
        description: generated.description || null,
        daysPerWeek: generated.daysPerWeek || null,
        duration: generated.duration || null,
        level: generated.level || null,
        status: 'draft',
        assignedAt: now,
        createdAt: now,
        updatedAt: now,
      })

      // Insert exercises
      if (generated.exercises && Array.isArray(generated.exercises)) {
        for (let i = 0; i < generated.exercises.length; i++) {
          const ex = generated.exercises[i]
          await db.insert(schema.workoutExercises).values({
            id: generateId(),
            workoutId: workoutId,
            name: ex.name,
            sets: ex.sets ? Number(ex.sets) : null,
            reps: ex.reps != null ? String(ex.reps) : null,
            rest: ex.rest != null ? String(ex.rest) : null,
            notes: ex.notes != null ? String(ex.notes) : null,
            day: ex.day != null ? String(ex.day) : null,
            order: i,
          })
        }
      }

      const workout = await db.select().from(schema.workouts).where(eq(schema.workouts.id, workoutId)).get()
      const exercises = await db.select().from(schema.workoutExercises).where(eq(schema.workoutExercises.workoutId, workoutId)).all()
      return created({ ...workout, exercises })
    } catch (err: any) {
      return error(err.message || 'Error al generar la rutina con IA', 500)
    }
  }


  if (path.match(/^\/[a-f0-9-]{36}$/) && method === 'PUT') {
    const authResult = await requireAdmin(request, env)
    if (authResult instanceof Response) return authResult
    const id = path.slice(1)
    try {
      const body = await request.json().catch(() => ({})) as Record<string, unknown>
      const parsed = workoutSchema.safeParse(body)
      if (!parsed.success) return error(parsed.error.errors[0]?.message ?? 'Datos inválidos', 422)
      const { exercises, ...workoutData } = parsed.data
      
      // Validate if exists
      const existing = await db.select().from(schema.workouts).where(eq(schema.workouts.id, id)).get()
      if (!existing) return notFound()

      const now = new Date().toISOString()
      if (workoutData.status === 'active') {
        await db.update(schema.workouts)
          .set({ status: 'archived', updatedAt: now })
          .where(and(eq(schema.workouts.userId, existing.userId), eq(schema.workouts.status, 'active')))
      }
      await db.update(schema.workouts).set({ ...workoutData, updatedAt: now }).where(eq(schema.workouts.id, id))
      
      // Replace exercises
      await db.delete(schema.workoutExercises).where(eq(schema.workoutExercises.workoutId, id))
      for (const ex of exercises) {
        await db.insert(schema.workoutExercises).values({ id: generateId(), workoutId: id, ...ex })
      }
      
      const updatedWorkout = await db.select().from(schema.workouts).where(eq(schema.workouts.id, id)).get()
      return ok(updatedWorkout)
    } catch (err: any) {
      return error(err.message || 'Error interno al actualizar la rutina', 500)
    }
  }

  if (path.match(/^\/[a-f0-9-]{36}$/) && method === 'DELETE') {
    const authResult = await requireAdmin(request, env)
    if (authResult instanceof Response) return authResult
    const id = path.slice(1)
    await db.delete(schema.workouts).where(eq(schema.workouts.id, id))
    return ok({ message: 'Rutina eliminada' })
  }

  return error('Ruta no encontrada', 404)
}
