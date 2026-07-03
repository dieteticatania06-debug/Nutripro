import type { Env } from '../types/env'
import { TokenService } from '../services/tokenService'
import { unauthorized } from '../utils/response'
import type { AuthTokenPayload, UserRole } from '@nutripro/shared'

export interface AuthContext {
  userId: string
  email: string
  role: UserRole
}

export async function requireAuth(
  request: Request,
  env: Env
): Promise<{ auth: AuthContext } | Response> {
  const tokenService = new TokenService(env.JWT_SECRET)
  const token = tokenService.extractFromRequest(request)

  if (!token) return unauthorized('Token no proporcionado')

  const payload = await tokenService.verifyAccessToken(token)
  if (!payload) return unauthorized('Token inválido o expirado')

  return {
    auth: {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    },
  }
}

export async function requireRole(
  request: Request,
  env: Env,
  role: UserRole
): Promise<{ auth: AuthContext } | Response> {
  const result = await requireAuth(request, env)
  if (result instanceof Response) return result
  if (result.auth.role !== role) {
    return new Response(JSON.stringify({ success: false, error: 'Acceso denegado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return result
}

export async function requireAdmin(
  request: Request,
  env: Env
): Promise<{ auth: AuthContext } | Response> {
  return requireRole(request, env, 'admin')
}
