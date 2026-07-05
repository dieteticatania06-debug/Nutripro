import { SignJWT, jwtVerify } from 'jose'
import type { AuthTokenPayload, UserRole } from '@nutripro/shared'

export class TokenService {
  private secret: Uint8Array

  constructor(jwtSecret: string) {
    this.secret = new TextEncoder().encode(jwtSecret)
  }

  async generateAccessToken(payload: Omit<AuthTokenPayload, 'iat' | 'exp'>): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setJti(crypto.randomUUID())
      .setExpirationTime('15m')
      .sign(this.secret)
  }

  async generateRefreshToken(payload: Omit<AuthTokenPayload, 'iat' | 'exp'>): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setJti(crypto.randomUUID())
      .setExpirationTime('30d')
      .sign(this.secret)
  }

  async generateEmailToken(userId: string, email: string): Promise<string> {
    return new SignJWT({ sub: userId, email, type: 'email_verification' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setJti(crypto.randomUUID())
      .setExpirationTime('24h')
      .sign(this.secret)
  }

  async generatePasswordResetToken(userId: string, email: string): Promise<string> {
    return new SignJWT({ sub: userId, email, type: 'password_reset' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setJti(crypto.randomUUID())
      .setExpirationTime('1h')
      .sign(this.secret)
  }

  async verifyAccessToken(token: string): Promise<AuthTokenPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret)
      return payload as unknown as AuthTokenPayload
    } catch {
      return null
    }
  }

  async verifyRefreshToken(token: string): Promise<AuthTokenPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret)
      return payload as unknown as AuthTokenPayload
    } catch {
      return null
    }
  }

  async verifyEmailToken(token: string): Promise<{ sub: string; email: string } | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret)
      if (payload['type'] !== 'email_verification') return null
      return { sub: payload.sub as string, email: payload['email'] as string }
    } catch {
      return null
    }
  }

  async verifyPasswordResetToken(token: string): Promise<{ sub: string; email: string } | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret)
      if (payload['type'] !== 'password_reset') return null
      return { sub: payload.sub as string, email: payload['email'] as string }
    } catch {
      return null
    }
  }

  extractFromRequest(request: Request): string | null {
    // Try Authorization header
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7)
    }
    // Try cookie
    const cookieHeader = request.headers.get('Cookie')
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map((c) => {
          const [key, ...rest] = c.split('=')
          return [key.trim(), rest.join('=')]
        })
      )
      return cookies['access_token'] ?? null
    }
    return null
  }
}
