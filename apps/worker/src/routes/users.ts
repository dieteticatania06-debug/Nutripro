import type { Env } from '../types/env'
import { createDb } from '../db'
import { schema } from '../db'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { ok, error, notFound, parsePagination } from '../utils/response'
import { profileSchema } from '@nutripro/shared'
import { generateId } from '../services/hashService'
import { eq, desc } from 'drizzle-orm'
import { StorageService } from '../services/storageService'
import { syncProfileToQuestionnaire, syncWeightToProgress } from '../services/syncService'

export async function handleUsers(request: Request, env: Env, path: string): Promise<Response> {
  const db = createDb(env.DB)
  const method = request.method

  // GET /users/profile — own profile
  if (path === '/profile' && method === 'GET') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult

    const profile = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, authResult.auth.userId))
      .get()
    if (!profile) return notFound('Perfil no encontrado')
    return ok(profile)
  }

  // PUT /users/profile — update own profile
  if (path === '/profile' && method === 'PUT') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult

    const body = await request.json().catch(() => ({}))
    const parsed = profileSchema.safeParse(body)
    if (!parsed.success) return error(parsed.error.errors[0]?.message ?? 'Datos inválidos', 422)

    const existing = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, authResult.auth.userId))
      .get()

    if (!existing) {
      await db.insert(schema.profiles).values({
        id: generateId(),
        userId: authResult.auth.userId,
        ...parsed.data,
        updatedAt: new Date().toISOString(),
      })
    } else {
      await db
        .update(schema.profiles)
        .set({ ...parsed.data, updatedAt: new Date().toISOString() })
        .where(eq(schema.profiles.userId, authResult.auth.userId))
    }

    // Synchronize profile data with the user's latest questionnaire
    await syncProfileToQuestionnaire(db, authResult.auth.userId, parsed.data)

    // Synchronize weight to progress records
    if (parsed.data.weight !== undefined && parsed.data.weight !== null) {
      await syncWeightToProgress(db, authResult.auth.userId, parsed.data.weight)
    }

    const updated = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, authResult.auth.userId))
      .get()
    return ok(updated)
  }

  // POST /users/avatar — upload avatar to R2
  if (path === '/avatar' && method === 'POST') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult

    const contentType = request.headers.get('Content-Type') ?? 'image/jpeg'
    if (!contentType.startsWith('image/')) return error('Solo se permiten imágenes', 400)

    const buffer = await request.arrayBuffer()
    if (buffer.byteLength > 5 * 1024 * 1024) return error('La imagen no puede superar 5MB', 400)

    const storage = new StorageService(env.STORAGE, env.WORKER_URL)
    const avatarUrl = await storage.uploadAvatar(authResult.auth.userId, buffer, contentType)

    await db
      .update(schema.profiles)
      .set({ avatarUrl, updatedAt: new Date().toISOString() })
      .where(eq(schema.profiles.userId, authResult.auth.userId))

    return ok({ avatarUrl })
  }

  // DELETE /users/avatar — delete avatar from R2 and profile
  if (path === '/avatar' && method === 'DELETE') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult

    const storage = new StorageService(env.STORAGE, env.WORKER_URL)
    await storage.deleteAvatar(authResult.auth.userId)

    await db
      .update(schema.profiles)
      .set({ avatarUrl: null, updatedAt: new Date().toISOString() })
      .where(eq(schema.profiles.userId, authResult.auth.userId))

    return ok({ avatarUrl: null })
  }

  // ─── Admin routes ─────────────────────────────────────────────

  // GET /users — list all clients (admin)
  if (path === '/' && method === 'GET') {
    const authResult = await requireAdmin(request, env)
    if (authResult instanceof Response) return authResult

    const url = new URL(request.url)
    const { page, pageSize, offset } = parsePagination(url)
    const search = url.searchParams.get('search') ?? ''

    const allUsers = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        role: schema.users.role,
        emailVerified: schema.users.emailVerified,
        createdAt: schema.users.createdAt,
        firstName: schema.profiles.firstName,
        lastName: schema.profiles.lastName,
        phone: schema.profiles.phone,
        avatarUrl: schema.profiles.avatarUrl,
        plan: schema.profiles.plan,
      })
      .from(schema.users)
      .leftJoin(schema.profiles, eq(schema.users.id, schema.profiles.userId))

    const filtered = search
      ? allUsers.filter(
          (u) =>
            u.email.includes(search.toLowerCase()) ||
            u.firstName?.toLowerCase().includes(search.toLowerCase()) ||
            u.lastName?.toLowerCase().includes(search.toLowerCase())
        )
      : allUsers

    const total = filtered.length
    const items = filtered.slice(offset, offset + pageSize)

    return ok({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  }

  // GET /users/:id — get single client (admin)
  if (path.match(/^\/[a-f0-9-]{36}$/) && method === 'GET') {
    const authResult = await requireAdmin(request, env)
    if (authResult instanceof Response) return authResult

    const userId = path.slice(1)
    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get()
    if (!user) return notFound('Usuario no encontrado')

    const profile = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, userId)).get()

    return ok({ id: user.id, email: user.email, role: user.role, emailVerified: user.emailVerified, createdAt: user.createdAt, profile })
  }

  // PATCH /users/:id/plan — assign plan to client (admin)
  if (path.match(/^\/[a-f0-9-]{36}\/plan$/) && method === 'PATCH') {
    const authResult = await requireAdmin(request, env)
    if (authResult instanceof Response) return authResult

    const userId = path.slice(1).replace('/plan', '')
    const body = await request.json().catch(() => ({})) as { plan?: string | null }
    const allowed = ['basico', 'pro', 'elite', null]
    if (body.plan !== undefined && !allowed.includes(body.plan ?? null)) {
      return error('Plan inválido. Opciones: basico, pro, elite o null', 422)
    }

    const existing = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, userId))
      .get()

    if (!existing) return notFound('Perfil del usuario no encontrado')

    await db
      .update(schema.profiles)
      .set({ plan: (body.plan ?? null) as any, updatedAt: new Date().toISOString() })
      .where(eq(schema.profiles.userId, userId))

    return ok({ userId, plan: body.plan ?? null })
  }

  // DELETE /users/:id — delete client (admin)
  if (path.match(/^\/[a-f0-9-]{36}$/) && method === 'DELETE') {
    const authResult = await requireAdmin(request, env)
    if (authResult instanceof Response) return authResult

    const userId = path.slice(1)
    await db.delete(schema.users).where(eq(schema.users.id, userId))
    return ok({ message: 'Usuario eliminado' })
  }

  return error('Ruta no encontrada', 404)
}


