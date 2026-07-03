// Password hashing using Web Crypto API (bcrypt-compatible via PBKDF2)
// Using PBKDF2 because bcrypt is not available in Cloudflare Workers
// For production, consider using argon2 via a compatible library

const ITERATIONS = 100_000
const KEY_LENGTH = 32
const ALGORITHM = 'SHA-256'

async function deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: ALGORITHM,
    },
    keyMaterial,
    KEY_LENGTH * 8
  )
  return new Uint8Array(derivedBits)
}

function toHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await deriveKey(password, salt)
  return `${toHex(salt)}:${toHex(hash)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [saltHex, hashHex] = stored.split(':')
    if (!saltHex || !hashHex) return false
    const salt = fromHex(saltHex)
    const hash = await deriveKey(password, salt)
    const storedHash = fromHex(hashHex)
    // Constant-time comparison
    if (hash.length !== storedHash.length) return false
    let diff = 0
    for (let i = 0; i < hash.length; i++) {
      diff |= hash[i] ^ storedHash[i]
    }
    return diff === 0
  } catch {
    return false
  }
}

export function generateSecureToken(length = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return toHex(bytes)
}

export function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  // UUID v4 format
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = toHex(bytes)
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-')
}
