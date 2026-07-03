// ─── Response Helpers ─────────────────────────────────────────

export function ok<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function created<T>(data: T): Response {
  return ok(data, 201)
}

export function noContent(): Response {
  return new Response(null, { status: 204 })
}

export function error(message: string, status = 400): Response {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function unauthorized(message = 'No autorizado'): Response {
  return error(message, 401)
}

export function forbidden(message = 'Acceso denegado'): Response {
  return error(message, 403)
}

export function notFound(message = 'No encontrado'): Response {
  return error(message, 404)
}

export function conflict(message: string): Response {
  return error(message, 409)
}

export function serverError(message = 'Error interno del servidor'): Response {
  return error(message, 500)
}

export function validationError(errors: Record<string, string[]>): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Error de validación',
      errors,
    }),
    {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

// ─── CORS Headers ─────────────────────────────────────────────

export function corsHeaders(origin: string): HeadersInit {
  const allowedOrigins = [
    'http://127.0.0.1:3000',
    'http://localhost:3000',
    'https://nutripro.pages.dev',
    'https://nutripro.es',
    'https://www.nutripro.es',
    'https://api.nutripro.es',
  ]
  const allowedOrigin = (allowedOrigins.includes(origin) || origin.endsWith('.pages.dev')) ? origin : allowedOrigins[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  }
}

export function withCors(response: Response, origin: string): Response {
  try {
    Object.entries(corsHeaders(origin)).forEach(([k, v]) => response.headers.set(k, v))
    return response
  } catch {
    const headers = new Headers(response.headers)
    Object.entries(corsHeaders(origin)).forEach(([k, v]) => headers.set(k, v))
    return new Response(response.body, {
      status: response.status,
      headers,
    })
  }
}

// ─── Cookie Helpers ───────────────────────────────────────────

export interface CookieOptions {
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
  maxAge?: number
  path?: string
}

export function setCookieHeader(name: string, value: string, options: CookieOptions = {}): string {
  const parts = [`${name}=${value}`]
  if (options.httpOnly) parts.push('HttpOnly')
  if (options.secure) parts.push('Secure')
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`)
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`)
  parts.push(`Path=${options.path ?? '/'}`)
  return parts.join('; ')
}

export function clearCookieHeader(name: string, options: CookieOptions = {}): string {
  return setCookieHeader(name, '', { maxAge: 0, httpOnly: true, sameSite: 'Lax', ...options })
}

// ─── Pagination Helper ────────────────────────────────────────

export function parsePagination(url: URL): { page: number; pageSize: number; offset: number } {
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20')))
  return { page, pageSize, offset: (page - 1) * pageSize }
}
