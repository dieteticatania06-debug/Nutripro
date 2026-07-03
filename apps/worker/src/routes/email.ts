import type { Env } from '../types/env'
import { EmailService } from '../services/emailService'
import { contactSchema } from '@nutripro/shared'
import { ok, error } from '../utils/response'

export async function handleEmail(request: Request, env: Env, path: string): Promise<Response> {
  const emailService = new EmailService(env.BREVO_API_KEY)
  const method = request.method

  // POST /email/contact
  if (path === '/contact' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const parsed = contactSchema.safeParse(body)
    if (!parsed.success) return error(parsed.error.errors[0]?.message ?? 'Datos inválidos', 422)

    // Get admin email from env or use a default
    const adminEmail = 'dieteticatania06@gmail.com' // Should be configurable
    const sent = await emailService.sendContactForm(
      adminEmail,
      parsed.data.name,
      parsed.data.email,
      parsed.data.subject,
      parsed.data.message
    )

    if (!sent) return error('No se pudo enviar el correo. Inténtalo de nuevo.', 500)
    return ok({ message: 'Mensaje enviado correctamente' })
  }

  return error('Ruta no encontrada', 404)
}
