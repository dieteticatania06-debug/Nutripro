import type { Env } from '../types/env'
import { createDb } from '../db'
import { schema } from '../db'
import { TokenService } from '../services/tokenService'
import { hashPassword, verifyPassword, generateId } from '../services/hashService'
import { EmailService } from '../services/emailService'
import { StorageService } from '../services/storageService'
import {
  ok, created, error, unauthorized, conflict,
  setCookieHeader, clearCookieHeader, withCors, corsHeaders
} from '../utils/response'
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '@nutripro/shared'
import { eq, and, gt } from 'drizzle-orm'

export async function handleAuth(request: Request, env: Env, path: string): Promise<Response> {
  const db = createDb(env.DB)
  const tokenService = new TokenService(env.JWT_SECRET)
  const emailService = new EmailService(env.BREVO_API_KEY)
  const url = new URL(request.url)
  const method = request.method

  // POST /auth/register
  if (path === '/register' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return error(parsed.error.errors[0]?.message ?? 'Datos inválidos', 422)
    }
    const { email, password, firstName, lastName, avatar } = parsed.data

    // Check existing
    const existing = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase())).get()
    if (existing) return conflict('Este email ya está registrado')

    const id = generateId()
    const passwordHash = await hashPassword(password)
    const profileId = generateId()

    // Handle avatar upload if provided
    let avatarUrl: string | null = null
    if (avatar) {
      try {
        const storage = new StorageService(env.STORAGE, env.WORKER_URL)
        const match = avatar.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/)
        if (match) {
          const contentType = match[1]
          const base64Data = match[2]
          const binaryString = atob(base64Data)
          const len = binaryString.length
          const bytes = new Uint8Array(len)
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          if (bytes.byteLength <= 5 * 1024 * 1024) {
            avatarUrl = await storage.uploadAvatar(id, bytes.buffer, contentType)
          }
        }
      } catch (err) {
        console.error('Failed to upload avatar on registration:', err)
      }
    }

    // Create user + profile in transaction-like sequence (D1 doesn't support true transactions in HTTP API)
    await db.insert(schema.users).values({
      id,
      email: email.toLowerCase(),
      passwordHash,
      role: 'client',
      emailVerified: false,
    })

    await db.insert(schema.profiles).values({
      id: profileId,
      userId: id,
      firstName,
      lastName,
      avatarUrl,
    })

    // Generate email verification token and save it
    const token = await tokenService.generateEmailToken(id, email.toLowerCase())
    await db.insert(schema.emailVerifications).values({
      id: generateId(),
      userId: id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    // Send verification email and wait for completion to prevent serverless suspension
    await emailService.sendEmailVerification(email.toLowerCase(), firstName, token, env.APP_URL).catch(console.error)

    return created({
      message: 'Cuenta creada. Por favor, verifica tu correo electrónico para activar tu cuenta.',
      userId: id,
    })
  }

  // POST /auth/login
  if (path === '/login' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) return error('Credenciales inválidas', 422)
    const { email, password } = parsed.data

    const user = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase())).get()
    if (!user) return unauthorized('Email o contraseña incorrectos')

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) return unauthorized('Email o contraseña incorrectos')

    // Verify email before logging in
    if (!user.emailVerified) return unauthorized('Verifica tu email antes de iniciar sesión')

    const accessToken = await tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role as 'admin' | 'client',
    })
    const refreshToken = await tokenService.generateRefreshToken({
      sub: user.id,
      email: user.email,
      role: user.role as 'admin' | 'client',
    })

    // Store refresh token
    await db.insert(schema.refreshTokens).values({
      id: generateId(),
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const profile = await db.select({ plan: schema.profiles.plan }).from(schema.profiles).where(eq(schema.profiles.userId, user.id)).get()

    const isProduction = env.ENVIRONMENT === 'production'
    const response = ok({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        plan: profile?.plan ?? null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accessToken,
    })

    const headers = new Headers(response.headers)
    headers.append('Set-Cookie', setCookieHeader('access_token', accessToken, {
      httpOnly: true, secure: isProduction, sameSite: isProduction ? 'None' : 'Lax', maxAge: 900, // 15min
    }))
    headers.append('Set-Cookie', setCookieHeader('refresh_token', refreshToken, {
      httpOnly: true, secure: isProduction, sameSite: isProduction ? 'None' : 'Lax', maxAge: 2592000, // 30d
    }))

    return new Response(response.body, { status: 200, headers })
  }

  // POST /auth/logout
  if (path === '/logout' && method === 'POST') {
    // Extract and revoke refresh token
    const cookieHeader = request.headers.get('Cookie') ?? ''
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map((c) => {
        const [k, ...v] = c.split('=')
        return [k.trim(), v.join('=')]
      })
    )
    const refreshToken = cookies['refresh_token']
    if (refreshToken) {
      await db
        .update(schema.refreshTokens)
        .set({ revokedAt: new Date().toISOString() })
        .where(eq(schema.refreshTokens.token, refreshToken))
    }

    const isProduction = env.ENVIRONMENT === 'production'
    const headers = new Headers({ 'Content-Type': 'application/json' })
    headers.append('Set-Cookie', clearCookieHeader('access_token', { secure: isProduction, sameSite: isProduction ? 'None' : 'Lax' }))
    headers.append('Set-Cookie', clearCookieHeader('refresh_token', { secure: isProduction, sameSite: isProduction ? 'None' : 'Lax' }))
    return new Response(JSON.stringify({ success: true, message: 'Sesión cerrada' }), { status: 200, headers })
  }

  // POST /auth/refresh
  if (path === '/refresh' && method === 'POST') {
    const isProduction = env.ENVIRONMENT === 'production'
    const clearCookiesAndReturn = (errResponse: Response) => {
      const headers = new Headers(errResponse.headers)
      headers.append('Set-Cookie', clearCookieHeader('access_token', { secure: isProduction, sameSite: isProduction ? 'None' : 'Lax' }))
      headers.append('Set-Cookie', clearCookieHeader('refresh_token', { secure: isProduction, sameSite: isProduction ? 'None' : 'Lax' }))
      return new Response(errResponse.body, { status: errResponse.status, headers })
    }

    const cookieHeader = request.headers.get('Cookie') ?? ''
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map((c) => {
        const [k, ...v] = c.split('=')
        return [k.trim(), v.join('=')]
      })
    )
    const refreshToken = cookies['refresh_token']
    if (!refreshToken) return clearCookiesAndReturn(unauthorized('Refresh token no encontrado'))

    const payload = await tokenService.verifyRefreshToken(refreshToken)
    if (!payload) return clearCookiesAndReturn(unauthorized('Refresh token inválido'))

    // Check not revoked
    const stored = await db
      .select()
      .from(schema.refreshTokens)
      .where(and(eq(schema.refreshTokens.token, refreshToken), eq(schema.refreshTokens.userId, payload.sub)))
      .get()
    if (!stored || stored.revokedAt) return clearCookiesAndReturn(unauthorized('Token revocado'))

    const newAccessToken = await tokenService.generateAccessToken({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    })

    const headers = new Headers({ 'Content-Type': 'application/json' })
    headers.append('Set-Cookie', setCookieHeader('access_token', newAccessToken, {
      httpOnly: true, secure: isProduction, sameSite: isProduction ? 'None' : 'Lax', maxAge: 900,
    }))
    return new Response(JSON.stringify({ success: true, data: { accessToken: newAccessToken } }), { status: 200, headers })
  }

  // POST /auth/verify-email
  if (path === '/verify-email' && method === 'POST') {
    const { token } = await request.json().catch(() => ({})) as { token?: string }
    if (!token) return error('Token requerido')

    const payload = await tokenService.verifyEmailToken(token)
    if (!payload) return error('Token inválido o expirado', 400)

    const verification = await db
      .select()
      .from(schema.emailVerifications)
      .where(eq(schema.emailVerifications.token, token))
      .get()

    if (!verification) return error('Token no encontrado', 400)
    if (verification.usedAt) return error('Token ya utilizado', 400)

    // Mark used and verify user
    await db
      .update(schema.emailVerifications)
      .set({ usedAt: new Date().toISOString() })
      .where(eq(schema.emailVerifications.id, verification.id))

    await db
      .update(schema.users)
      .set({ emailVerified: true, updatedAt: new Date().toISOString() })
      .where(eq(schema.users.id, payload.sub))

    return ok({ message: 'Email verificado correctamente' })
  }

  // POST /auth/forgot-password
  if (path === '/forgot-password' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const parsed = forgotPasswordSchema.safeParse(body)
    if (!parsed.success) return error('Email inválido', 422)
    const { email } = parsed.data

    const user = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase())).get()
    // Always return success to avoid email enumeration
    if (!user) return ok({ message: 'Si el email existe, recibirás instrucciones.' })

    const profile = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, user.id)).get()
    const token = await tokenService.generatePasswordResetToken(user.id, user.email)

    await db.insert(schema.passwordResets).values({
      id: generateId(),
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })

    await emailService.sendPasswordReset(
      email,
      profile?.firstName ?? 'Usuario',
      token,
      env.APP_URL
    )

    return ok({ message: 'Si el email existe, recibirás instrucciones.' })
  }

  // POST /auth/reset-password
  if (path === '/reset-password' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const parsed = resetPasswordSchema.safeParse(body)
    if (!parsed.success) return error(parsed.error.errors[0]?.message ?? 'Datos inválidos', 422)
    const { token, password } = parsed.data

    const payload = await tokenService.verifyPasswordResetToken(token)
    if (!payload) return error('Token inválido o expirado', 400)

    const reset = await db
      .select()
      .from(schema.passwordResets)
      .where(eq(schema.passwordResets.token, token))
      .get()

    if (!reset || reset.usedAt) return error('Token ya utilizado o no encontrado', 400)

    const newHash = await hashPassword(password)
    await db
      .update(schema.users)
      .set({ passwordHash: newHash, updatedAt: new Date().toISOString() })
      .where(eq(schema.users.id, payload.sub))

    await db
      .update(schema.passwordResets)
      .set({ usedAt: new Date().toISOString() })
      .where(eq(schema.passwordResets.id, reset.id))

    // Revoke all refresh tokens for security
    await db
      .update(schema.refreshTokens)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(schema.refreshTokens.userId, payload.sub))

    return ok({ message: 'Contraseña actualizada correctamente' })
  }

  // GET /auth/me
  if (path === '/me' && method === 'GET') {
    const tokenService2 = new TokenService(env.JWT_SECRET)
    const token2 = tokenService2.extractFromRequest(request)
    if (!token2) return unauthorized()
    const payload2 = await tokenService2.verifyAccessToken(token2)
    if (!payload2) return unauthorized()
    const user2 = await db.select().from(schema.users).where(eq(schema.users.id, payload2.sub)).get()
    if (!user2) return unauthorized()
    const profile2 = await db.select({ plan: schema.profiles.plan }).from(schema.profiles).where(eq(schema.profiles.userId, payload2.sub)).get()
    return ok({
      id: user2.id,
      email: user2.email,
      role: user2.role,
      emailVerified: user2.emailVerified,
      plan: profile2?.plan ?? null,
      createdAt: user2.createdAt,
      updatedAt: user2.updatedAt,
    })
  }

  return error('Ruta no encontrada', 404)
}
