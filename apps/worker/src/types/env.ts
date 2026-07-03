import type { D1Database, R2Bucket } from '@cloudflare/workers-types'

export interface Env {
  // D1 Database
  DB: D1Database

  // R2 Storage
  STORAGE: R2Bucket

  // Secrets
  JWT_SECRET: string
  BREVO_API_KEY: string
  GROQ_API_KEY: string

  // Vars
  ENVIRONMENT: string
  APP_URL: string
  WORKER_URL: string
}
