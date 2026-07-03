import type { Env } from './types/env'
import { handleAuth } from './routes/auth'
import { handleUsers } from './routes/users'
import { handleDiets } from './routes/diets'
import { handleReviews } from './routes/reviews'

import { handleWorkouts } from './routes/workouts'
import { handleAppointments } from './routes/appointments'
import { handleProgress } from './routes/progress'
import { handleChat } from './routes/chat'
import { handleQuestionnaires } from './routes/questionnaires'
import { handleEmail } from './routes/email'
import { handleCheckins } from './routes/checkins'
import { corsHeaders, withCors } from './utils/response'
import { createDb } from './db'
import { schema } from './db'
import { eq } from 'drizzle-orm'

// ─── Rate Limiting (simple in-memory, production should use KV) ────
const requestCounts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string, limit = 100, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = requestCounts.get(ip)
  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

// ─── Security Headers ────────────────────────────────────────────
function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers)
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('X-XSS-Protection', '1; mode=block')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return new Response(response.body, { status: response.status, headers })
}

// ─── Storage proxy ───────────────────────────────────────────────
async function handleStorage(request: Request, env: Env, key: string): Promise<Response> {
  const object = await env.STORAGE.get(key)
  if (!object) {
    return new Response('Not found', { status: 404 })
  }
  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType ?? 'application/octet-stream')
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  return new Response(object.body as ReadableStream, { headers })
}

// ─── Admin stats ─────────────────────────────────────────────────
async function handleAdminStats(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 })
  const db = createDb(env.DB)
  const [users, pendingAppts, questionnaires, chats] = await Promise.all([
    db.select().from(schema.users).where(eq(schema.users.role, 'client')).all(),
    db.select().from(schema.appointments).where(eq(schema.appointments.status, 'pending')).all(),
    db.select().from(schema.questionnaires).all(),
    db.select().from(schema.chats).all(),
  ])
  const totalUnread = chats.reduce((sum, c) => sum + (c.unreadByAdmin ?? 0), 0)
  return new Response(JSON.stringify({
    success: true,
    data: {
      totalClients: users.length,
      pendingAppointments: pendingAppts.length,
      totalQuestionnaires: questionnaires.length,
      unreadMessages: totalUnread,
    }
  }), { headers: { 'Content-Type': 'application/json' } })
}

// ─── Main Router ─────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin') ?? ''
    const cors = corsHeaders(origin)

    // Validate JWT_SECRET security configuration
    if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
      console.error('CRITICAL ERROR: env.JWT_SECRET is missing or too weak (minimum 32 characters required)')
      const response = new Response(
        JSON.stringify({ success: false, error: 'Error de configuración de seguridad en el servidor.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
      return withCors(response, origin)
    }

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    // Rate limiting (bypassed in development)
    const isDev = env.ENVIRONMENT === 'development'
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
    const authLimit = url.pathname.startsWith('/auth/login') || url.pathname.startsWith('/auth/register') ? 10 : 100
    if (!isDev && !checkRateLimit(ip, authLimit)) {
      const response = new Response(
        JSON.stringify({ success: false, error: 'Demasiadas peticiones. Inténtalo en un minuto.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
      return withCors(response, origin)
    }

    let response: Response

    try {
      const segments = url.pathname.split('/').filter(Boolean)
      const root = segments[0] ?? ''
      const subPath = '/' + segments.slice(1).join('/')

      if (root === 'auth') {
        response = await handleAuth(request, env, subPath)
      } else if (root === 'users') {
        response = await handleUsers(request, env, subPath)
      } else if (root === 'diets') {
        response = await handleDiets(request, env, subPath)

      } else if (root === 'workouts') {
        response = await handleWorkouts(request, env, subPath)
      } else if (root === 'appointments') {
        response = await handleAppointments(request, env, subPath)
      } else if (root === 'progress') {
        response = await handleProgress(request, env, subPath)
      } else if (root === 'chat') {
        response = await handleChat(request, env, subPath)
      } else if (root === 'questionnaires') {
        response = await handleQuestionnaires(request, env, subPath)
      } else if (root === 'email') {
        response = await handleEmail(request, env, subPath)
      } else if (root === 'reviews') {
        response = await handleReviews(request, env, subPath)
      } else if (root === 'checkins') {
        response = await handleCheckins(request, env, subPath)
      } else if (root === 'admin' && segments[1] === 'stats') {
        response = await handleAdminStats(request, env)
      } else if (root === 'storage') {
        const key = segments.slice(1).join('/')
        response = await handleStorage(request, env, key)
      } else if (root === 'health') {
        response = new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
          headers: { 'Content-Type': 'application/json' },
        })
      } else {
        response = new Response(JSON.stringify({ success: false, error: 'Ruta no encontrada' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    } catch (err) {
      console.error('Worker error:', err)
      response = new Response(
        JSON.stringify({ success: false, error: 'Error interno del servidor' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return addSecurityHeaders(withCors(response, origin))
  },
}
