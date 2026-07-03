import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? 'change-me-in-production-min-32-chars')

// Protected route patterns
const DASHBOARD_PATTERN = /^\/dashboard(\/.*)?$/
const ADMIN_PATTERN = /^\/admin(\/.*)?$/
const AUTH_PATTERN = /^\/auth\/(login|registro)(\/.*)?$/

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as { sub: string; email: string; role: string; exp: number }
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let token = request.cookies.get('access_token')?.value
  const refreshToken = request.cookies.get('refresh_token')?.value
  let responseCookieToken: string | null = null

  // If access_token is missing or expired, but we have a refresh_token, try to refresh it
  if (!token && refreshToken) {
    try {
      const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL ?? 'http://127.0.0.1:8787'
      const refreshResponse = await fetch(`${workerUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Cookie': `refresh_token=${refreshToken}`,
        },
      })
      if (refreshResponse.ok) {
        const body = await refreshResponse.json() as any
        const newAccessToken = body.data?.accessToken
        if (newAccessToken) {
          token = newAccessToken
          responseCookieToken = newAccessToken
        }
      }
    } catch (e) {
      console.error('Middleware token refresh error:', e)
    }
  }

  // If accessing auth pages while already logged in → redirect to dashboard
  if (AUTH_PATTERN.test(pathname)) {
    if (token) {
      const payload = await verifyToken(token)
      if (payload) {
        const dest = payload.role === 'admin' ? '/admin' : '/dashboard'
        const response = NextResponse.redirect(new URL(dest, request.url))
        if (responseCookieToken) {
          response.cookies.set('access_token', responseCookieToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 900,
            path: '/',
          })
        }
        return response
      }
    }
    return NextResponse.next()
  }

  // Protected dashboard routes
  if (DASHBOARD_PATTERN.test(pathname) || ADMIN_PATTERN.test(pathname)) {
    if (!token) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('access_token')
      response.cookies.delete('refresh_token')
      return response
    }

    const payload = await verifyToken(token)
    if (!payload) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('access_token')
      response.cookies.delete('refresh_token')
      return response
    }

    // Admin routes: only admin role
    if (ADMIN_PATTERN.test(pathname) && payload.role !== 'admin') {
      const response = NextResponse.redirect(new URL('/dashboard', request.url))
      if (responseCookieToken) {
        response.cookies.set('access_token', responseCookieToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 900,
          path: '/',
        })
      }
      return response
    }

    // Dashboard routes: only client role (admin goes to /admin)
    if (DASHBOARD_PATTERN.test(pathname) && payload.role === 'admin') {
      const response = NextResponse.redirect(new URL('/admin', request.url))
      if (responseCookieToken) {
        response.cookies.set('access_token', responseCookieToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 900,
          path: '/',
        })
      }
      return response
    }

    const response = NextResponse.next()
    if (responseCookieToken) {
      response.cookies.set('access_token', responseCookieToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 900,
        path: '/',
      })
    }
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/auth/login', '/auth/registro'],
}
