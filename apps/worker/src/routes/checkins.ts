import type { Env } from '../types/env'
import { createDb } from '../db'
import { schema } from '../db'
import { requireAuth } from '../middleware/auth'
import { ok, created, error } from '../utils/response'
import { weeklyCheckinSchema } from '@nutripro/shared'
import { generateId } from '../services/hashService'
import { eq, desc, and } from 'drizzle-orm'

export async function handleCheckins(request: Request, env: Env, path: string): Promise<Response> {
  const db = createDb(env.DB)
  const method = request.method

  // GET /checkins/ — list own check-ins (client) or by userId (admin)
  if (path === '/' && method === 'GET') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult

    const url = new URL(request.url)
    const userId = authResult.auth.role === 'admin'
      ? (url.searchParams.get('userId') ?? authResult.auth.userId)
      : authResult.auth.userId

    const items = await db
      .select()
      .from(schema.weeklyCheckins)
      .where(eq(schema.weeklyCheckins.userId, userId))
      .orderBy(desc(schema.weeklyCheckins.weekLabel))
      .all()

    return ok(items)
  }

  // POST /checkins/ — create or update check-in for a week (upsert by userId+weekLabel)
  if (path === '/' && method === 'POST') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult

    const body = await request.json().catch(() => ({}))
    const parsed = weeklyCheckinSchema.safeParse(body)
    if (!parsed.success) return error(parsed.error.errors[0]?.message ?? 'Datos inválidos', 422)

    const now = new Date().toISOString()
    const userId = authResult.auth.userId
    const { weekLabel, dietAdherence, energyLevel, hungerLevel, mood, notes } = parsed.data

    // Check if a check-in for this week already exists
    const existing = await db
      .select()
      .from(schema.weeklyCheckins)
      .where(
        and(
          eq(schema.weeklyCheckins.userId, userId),
          eq(schema.weeklyCheckins.weekLabel, weekLabel)
        )
      )
      .get()

    if (existing) {
      // Update existing
      await db
        .update(schema.weeklyCheckins)
        .set({
          dietAdherence,
          energyLevel,
          hungerLevel: hungerLevel ?? null,
          mood: mood ?? null,
          notes: notes ?? null,
          updatedAt: now,
        })
        .where(eq(schema.weeklyCheckins.id, existing.id))

      const updated = await db
        .select()
        .from(schema.weeklyCheckins)
        .where(eq(schema.weeklyCheckins.id, existing.id))
        .get()
      return ok(updated)
    }

    // Create new
    const id = generateId()
    await db.insert(schema.weeklyCheckins).values({
      id,
      userId,
      weekLabel,
      dietAdherence,
      energyLevel,
      hungerLevel: hungerLevel ?? null,
      mood: mood ?? null,
      notes: notes ?? null,
      createdAt: now,
      updatedAt: now,
    })

    const record = await db
      .select()
      .from(schema.weeklyCheckins)
      .where(eq(schema.weeklyCheckins.id, id))
      .get()
    return created(record)
  }

  return error('Ruta no encontrada', 404)
}
