import type { Env } from '../types/env'
import { createDb } from '../db'
import { schema } from '../db'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { ok, created, error, notFound, conflict, forbidden } from '../utils/response'
import { appointmentRequestSchema, appointmentUpdateSchema } from '@nutripro/shared'
import { generateId } from '../services/hashService'
import { EmailService } from '../services/emailService'
import { eq, and, desc, gte, lte, ne } from 'drizzle-orm'

export async function handleAppointments(request: Request, env: Env, path: string): Promise<Response> {
  const db = createDb(env.DB)
  const emailService = new EmailService(env.BREVO_API_KEY)
  const method = request.method

  // GET /appointments — own list (client) or all (admin)
  if (path === '/' && method === 'GET') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult

    const url = new URL(request.url)

    if (authResult.auth.role === 'admin') {
      const date = url.searchParams.get('date')
      const status = url.searchParams.get('status')
      let items = await db.select({
        id: schema.appointments.id,
        userId: schema.appointments.userId,
        title: schema.appointments.title,
        date: schema.appointments.date,
        startTime: schema.appointments.startTime,
        endTime: schema.appointments.endTime,
        status: schema.appointments.status,
        notes: schema.appointments.notes,
        adminNotes: schema.appointments.adminNotes,
        createdAt: schema.appointments.createdAt,
        firstName: schema.profiles.firstName,
        lastName: schema.profiles.lastName,
        email: schema.users.email,
      })
        .from(schema.appointments)
        .leftJoin(schema.profiles, eq(schema.appointments.userId, schema.profiles.userId))
        .leftJoin(schema.users, eq(schema.appointments.userId, schema.users.id))
        .orderBy(desc(schema.appointments.date))
        .all()

      if (date) items = items.filter((a) => a.date === date)
      if (status) items = items.filter((a) => a.status === status)
      return ok(items)
    } else {
      const items = await db
        .select()
        .from(schema.appointments)
        .where(eq(schema.appointments.userId, authResult.auth.userId))
        .orderBy(desc(schema.appointments.date))
        .all()
      return ok(items)
    }
  }

  // GET /appointments/available?date=YYYY-MM-DD — check available slots
  if (path === '/available' && method === 'GET') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult

    const url = new URL(request.url)
    const date = url.searchParams.get('date')
    if (!date) return error('Fecha requerida')

    const booked = await db
      .select({ startTime: schema.appointments.startTime, endTime: schema.appointments.endTime })
      .from(schema.appointments)
      .where(and(eq(schema.appointments.date, date), ne(schema.appointments.status, 'cancelled')))
      .all()

    // Generate available 30-minute slots from 10:00 to 17:00
    const allSlots = []
    const current = new Date(`${date}T10:00:00`)
    const limit = new Date(`${date}T17:00:00`)

    while (current < limit) {
      const startStr = current.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })
      current.setMinutes(current.getMinutes() + 30)
      const endStr = current.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })

      const isTaken = booked.some((b) => b.startTime === startStr)
      allSlots.push({ startTime: startStr, endTime: endStr, isAvailable: !isTaken })
    }

    return ok(allSlots)
  }

  // POST /appointments — request appointment (client)
  if (path === '/' && method === 'POST') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult

    const body = await request.json().catch(() => ({}))
    const parsed = appointmentRequestSchema.safeParse(body)
    if (!parsed.success) return error(parsed.error.errors[0]?.message ?? 'Datos inválidos', 422)

    // Check for double booking
    const existing = await db
      .select()
      .from(schema.appointments)
      .where(and(
        eq(schema.appointments.date, parsed.data.date),
        eq(schema.appointments.startTime, parsed.data.startTime),
        ne(schema.appointments.status, 'cancelled')
      ))
      .get()
    if (existing) return conflict('Ese horario ya está ocupado')

    const id = generateId()
    const now = new Date().toISOString()
    await db.insert(schema.appointments).values({
      id,
      userId: authResult.auth.userId,
      ...parsed.data,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    })

    // Notify admin
    const profile = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, authResult.auth.userId)).get()
    const adminUser = await db.select().from(schema.users).where(eq(schema.users.role, 'admin')).get()
    if (adminUser) {
      await emailService.sendNewAppointmentRequest(
        adminUser.email,
        `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim(),
        parsed.data.date,
        parsed.data.startTime
      )
    }

    const appointment = await db.select().from(schema.appointments).where(eq(schema.appointments.id, id)).get()
    return created(appointment)
  }

  // PATCH /appointments/:id — update status (admin)
  if (path.match(/^\/[a-f0-9-]{36}$/) && method === 'PATCH') {
    const authResult = await requireAdmin(request, env)
    if (authResult instanceof Response) return authResult

    const id = path.slice(1)
    const body = await request.json().catch(() => ({}))
    const parsed = appointmentUpdateSchema.safeParse(body)
    if (!parsed.success) return error(parsed.error.errors[0]?.message ?? 'Datos inválidos', 422)

    const existing = await db.select().from(schema.appointments).where(eq(schema.appointments.id, id)).get()
    if (!existing) return notFound()

    await db
      .update(schema.appointments)
      .set({ ...parsed.data, updatedAt: new Date().toISOString() })
      .where(eq(schema.appointments.id, id))

    // Send notification emails
    const user = await db.select().from(schema.users).where(eq(schema.users.id, existing.userId)).get()
    const profile = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, existing.userId)).get()
    if (user && profile) {
      if (parsed.data.status === 'confirmed') {
        await emailService.sendAppointmentConfirmed(
          user.email, profile.firstName, existing.date, existing.startTime, env.APP_URL
        )
      } else if (parsed.data.status === 'cancelled') {
        await emailService.sendAppointmentCancelled(
          user.email, profile.firstName, existing.date, existing.startTime, parsed.data.adminNotes ?? undefined
        )
      }
    }

    const updated = await db.select().from(schema.appointments).where(eq(schema.appointments.id, id)).get()
    return ok(updated)
  }

  // DELETE /appointments/:id — client cancels own (or admin deletes)
  if (path.match(/^\/[a-f0-9-]{36}$/) && method === 'DELETE') {
    const authResult = await requireAuth(request, env)
    if (authResult instanceof Response) return authResult

    const id = path.slice(1)
    const appt = await db.select().from(schema.appointments).where(eq(schema.appointments.id, id)).get()
    if (!appt) return notFound()

    if (authResult.auth.role !== 'admin' && appt.userId !== authResult.auth.userId) return forbidden()

    await db
      .update(schema.appointments)
      .set({ status: 'cancelled', updatedAt: new Date().toISOString() })
      .where(eq(schema.appointments.id, id))

    return ok({ message: 'Cita cancelada' })
  }

  return error('Ruta no encontrada', 404)
}
