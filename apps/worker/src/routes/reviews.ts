import type { Env } from '../types/env'
import { createDb } from '../db'
import { schema } from '../db'
import { requireAuth } from '../middleware/auth'
import { ok, created, error } from '../utils/response'
import { reviewSchema } from '@nutripro/shared'
import { generateId } from '../services/hashService'
import { eq, desc } from 'drizzle-orm'

export async function handleReviews(request: Request, env: Env, path: string): Promise<Response> {
  const db = createDb(env.DB)
  const method = request.method

  // GET /reviews — list all reviews with profile names and avatars (public)
  if (path === '/' && method === 'GET') {
    const list = await db
      .select({
        id: schema.reviews.id,
        userId: schema.reviews.userId,
        rating: schema.reviews.rating,
        content: schema.reviews.content,
        createdAt: schema.reviews.createdAt,
        firstName: schema.profiles.firstName,
        lastName: schema.profiles.lastName,
        avatarUrl: schema.profiles.avatarUrl,
        email: schema.users.email,
      })
      .from(schema.reviews)
      .leftJoin(schema.profiles, eq(schema.reviews.userId, schema.profiles.userId))
      .leftJoin(schema.users, eq(schema.reviews.userId, schema.users.id))
      .orderBy(desc(schema.reviews.createdAt))
      .all()
    return ok(list)
  }

  // POST /reviews — create new review (authenticated)
  if (path === '/' && method === 'POST') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult

    const body = await request.json().catch(() => ({}))
    const parsed = reviewSchema.safeParse(body)
    if (!parsed.success) {
      return error(parsed.error.errors[0]?.message ?? 'Datos inválidos', 422)
    }

    const { rating, content } = parsed.data

    // Create new review
    const id = generateId()
    await db.insert(schema.reviews).values({
      id,
      userId: authResult.auth.userId,
      rating,
      content,
      createdAt: new Date().toISOString(),
    })

    const createdReview = await db
      .select()
      .from(schema.reviews)
      .where(eq(schema.reviews.id, id))
      .get()
    return created(createdReview)
  }

  // DELETE /reviews/:id — delete own review or any review if admin (authenticated)
  if (path.match(/^\/[a-f0-9-]{36}$/) && method === 'DELETE') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult

    const id = path.slice(1)
    const review = await db
      .select()
      .from(schema.reviews)
      .where(eq(schema.reviews.id, id))
      .get()

    if (!review) {
      return error('Reseña no encontrada', 404)
    }

    if (review.userId !== authResult.auth.userId && authResult.auth.role !== 'admin') {
      return error('Acceso denegado', 403)
    }

    await db.delete(schema.reviews).where(eq(schema.reviews.id, id))
    return ok({ message: 'Reseña eliminada correctamente' })
  }

  return error('Ruta no encontrada', 404)
}
