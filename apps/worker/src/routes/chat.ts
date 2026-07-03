import type { Env } from '../types/env'
import { createDb } from '../db'
import { schema } from '../db'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { ok, created, error, notFound, forbidden } from '../utils/response'
import { messageSchema } from '@nutripro/shared'
import { generateId } from '../services/hashService'
import { eq, desc, and } from 'drizzle-orm'

export async function handleChat(request: Request, env: Env, path: string): Promise<Response> {
  const db = createDb(env.DB)
  const method = request.method

  // GET /chat — get own chat (client) or list all chats (admin)
  if (path === '/' && method === 'GET') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult

    if (authResult.auth.role === 'admin') {
      const chats = await db
        .select({
          id: schema.chats.id,
          userId: schema.chats.userId,
          lastMessageAt: schema.chats.lastMessageAt,
          unreadByAdmin: schema.chats.unreadByAdmin,
          unreadByClient: schema.chats.unreadByClient,
          createdAt: schema.chats.createdAt,
          firstName: schema.profiles.firstName,
          lastName: schema.profiles.lastName,
          email: schema.users.email,
          avatarUrl: schema.profiles.avatarUrl,
        })
        .from(schema.chats)
        .leftJoin(schema.profiles, eq(schema.chats.userId, schema.profiles.userId))
        .leftJoin(schema.users, eq(schema.chats.userId, schema.users.id))
        .orderBy(desc(schema.chats.lastMessageAt))
        .all()
      return ok(chats)
    } else {
      // Get or create chat for this client
      let chat = await db.select().from(schema.chats).where(eq(schema.chats.userId, authResult.auth.userId)).get()
      if (!chat) {
        const id = generateId()
        const now = new Date().toISOString()
        await db.insert(schema.chats).values({ id, userId: authResult.auth.userId, createdAt: now, updatedAt: now })
        chat = await db.select().from(schema.chats).where(eq(schema.chats.userId, authResult.auth.userId)).get()
      }
      return ok(chat)
    }
  }

  // GET /chat/:chatId/messages — get messages
  if (path.match(/^\/[a-f0-9-]{36}\/messages$/) && method === 'GET') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult

    const chatId = path.split('/')[1]
    const chat = await db.select().from(schema.chats).where(eq(schema.chats.id, chatId)).get()
    if (!chat) return notFound('Chat no encontrado')

    if (authResult.auth.role !== 'admin' && chat.userId !== authResult.auth.userId) return forbidden()

    const url = new URL(request.url)
    const limit = Math.min(100, parseInt(url.searchParams.get('limit') ?? '50'))
    const before = url.searchParams.get('before') // cursor for pagination

    const msgs = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.chatId, chatId))
      .orderBy(desc(schema.messages.createdAt))
      .limit(limit)
      .all()

    // Mark messages as read
    const now = new Date().toISOString()
    if (authResult.auth.role === 'admin') {
      // Admin reads → clear admin unread count
      await db.update(schema.chats).set({ unreadByAdmin: 0, updatedAt: now }).where(eq(schema.chats.id, chatId))
    } else {
      // Client reads → clear client unread count
      await db.update(schema.chats).set({ unreadByClient: 0, updatedAt: now }).where(eq(schema.chats.id, chatId))
    }

    return ok(msgs.reverse()) // Return chronological order
  }

  // POST /chat/:chatId/messages — send message
  if (path.match(/^\/[a-f0-9-]{36}\/messages$/) && method === 'POST') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult

    const chatId = path.split('/')[1]
    const chat = await db.select().from(schema.chats).where(eq(schema.chats.id, chatId)).get()
    if (!chat) return notFound()
    if (authResult.auth.role !== 'admin' && chat.userId !== authResult.auth.userId) return forbidden()

    const body = await request.json().catch(() => ({}))
    const parsed = messageSchema.safeParse(body)
    if (!parsed.success) return error(parsed.error.errors[0]?.message ?? 'Mensaje inválido', 422)

    const id = generateId()
    const now = new Date().toISOString()
    const senderRole = authResult.auth.role === 'admin' ? 'admin' : 'client'

    await db.insert(schema.messages).values({
      id,
      chatId,
      senderId: authResult.auth.userId,
      senderRole,
      content: parsed.data.content,
      createdAt: now,
    })

    // Update chat metadata
    const update: Record<string, unknown> = {
      lastMessageAt: now,
      updatedAt: now,
    }
    if (senderRole === 'client') {
      update['unreadByAdmin'] = (chat.unreadByAdmin ?? 0) + 1
    } else {
      update['unreadByClient'] = (chat.unreadByClient ?? 0) + 1
    }
    await db.update(schema.chats).set(update).where(eq(schema.chats.id, chatId))

    const message = await db.select().from(schema.messages).where(eq(schema.messages.id, id)).get()
    return created(message)
  }

  // GET /chat/by-user/:userId — admin gets chat for specific user
  if (path.match(/^\/by-user\/[a-f0-9-]{36}$/) && method === 'GET') {
    const authResult = await requireAdmin(request, env)
    if (authResult instanceof Response) return authResult

    const userId = path.split('/')[2]
    let chat = await db.select().from(schema.chats).where(eq(schema.chats.userId, userId)).get()
    if (!chat) {
      const id = generateId()
      const now = new Date().toISOString()
      await db.insert(schema.chats).values({ id, userId, createdAt: now, updatedAt: now })
      chat = await db.select().from(schema.chats).where(eq(schema.chats.userId, userId)).get()
    }
    return ok(chat)
  }

  return error('Ruta no encontrada', 404)
}
