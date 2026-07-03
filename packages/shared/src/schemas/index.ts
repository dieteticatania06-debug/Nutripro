import { z } from 'zod'

// ─── Auth Schemas ─────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  confirmPassword: z.string().min(1, 'La confirmación es requerida'),
  firstName: z.string().min(2, 'Mínimo 2 caracteres').max(50),
  lastName: z.string().min(2, 'Mínimo 2 caracteres').max(50),
  avatar: z.string().optional().nullable(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
})

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

// ─── Profile Schemas ──────────────────────────────────────────

export const profileSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  phone: z.string().max(20).nullable().optional(),
  birthDate: z.string().nullable().optional(),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  height: z.number().min(100).max(250).nullable().optional(),
  weight: z.number().min(30).max(300).nullable().optional(),
  goal: z.string().max(500).nullable().optional(),
  allergies: z.string().max(500).nullable().optional(),
  observations: z.string().max(1000).nullable().optional(),
  theme: z.enum(['light', 'dark']).default('light').optional().nullable(),
})

// ─── Questionnaire Schema ─────────────────────────────────────

export const questionnaireSchema = z.object({
  objectives: z.string().min(10, 'Describe tus objetivos').max(2000),
  eatingHabits: z.string().min(10).max(2000),
  restrictions: z.string().min(5).max(2000),
  schedule: z.string().min(5).max(1000),
  sportsExperience: z.string().min(5).max(2000),
  observations: z.string().max(2000).nullable().optional(),
  trainingDays: z.string().optional().nullable(),
  trainingDuration: z.string().optional().nullable(),
  trainingLocation: z.string().optional().nullable(),
})

// ─── Diet Schemas ─────────────────────────────────────────────

export const dietSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().max(500).nullable().optional(),
  content: z.string().min(10),
  totalCalories: z.number().min(0).max(10000).nullable().optional(),
  status: z.enum(['active', 'archived']).default('active'),
})



// ─── Workout Schemas ──────────────────────────────────────────

export const workoutExerciseSchema = z.object({
  name: z.string().min(1).max(200),
  sets: z.number().min(1).max(20).nullable().optional(),
  reps: z.string().max(20).nullable().optional(),
  rest: z.string().max(20).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  order: z.number().min(0),
  day: z.string().max(50).nullable().optional(),
})

export const workoutSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().max(500).nullable().optional(),
  daysPerWeek: z.number().min(1).max(7).nullable().optional(),
  duration: z.number().min(1).nullable().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).nullable().optional(),
  status: z.enum(['active', 'archived']).default('active'),
  exercises: z.array(workoutExerciseSchema).default([]),
})

// ─── Appointment Schemas ──────────────────────────────────────

export const appointmentRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(500).nullable().optional(),
})

export const appointmentUpdateSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
  adminNotes: z.string().max(500).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
})

// ─── Progress Schemas ─────────────────────────────────────────

export const progressRecordSchema = z.object({
  recordedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight: z.number().min(20).max(500).nullable().optional(),
  bodyFat: z.number().min(0).max(100).nullable().optional(),
  chest: z.number().min(0).max(300).nullable().optional(),
  waist: z.number().min(0).max(300).nullable().optional(),
  hips: z.number().min(0).max(300).nullable().optional(),
  arms: z.number().min(0).max(100).nullable().optional(),
  thighs: z.number().min(0).max(200).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
})

// ─── Message Schemas ──────────────────────────────────────────

export const messageSchema = z.object({
  content: z.string().min(1, 'El mensaje no puede estar vacío').max(2000),
})

// ─── Contact Schemas ──────────────────────────────────────────

export const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  subject: z.string().min(5).max(200),
  message: z.string().min(20).max(2000),
})

// ─── Type Exports ─────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type ProfileInput = z.infer<typeof profileSchema>
export type QuestionnaireInput = z.infer<typeof questionnaireSchema>
export type DietInput = z.infer<typeof dietSchema>

export type WorkoutInput = z.infer<typeof workoutSchema>
export type WorkoutExerciseInput = z.infer<typeof workoutExerciseSchema>
export type AppointmentRequestInput = z.infer<typeof appointmentRequestSchema>
export type AppointmentUpdateInput = z.infer<typeof appointmentUpdateSchema>
export type ProgressRecordInput = z.infer<typeof progressRecordSchema>
export type MessageInput = z.infer<typeof messageSchema>
export type ContactInput = z.infer<typeof contactSchema>

// ─── Review Schema ───────────────────────────────────────────

export const reviewSchema = z.object({
  rating: z.number().min(1, 'Mínimo 1 estrella').max(5, 'Máximo 5 estrellas'),
  content: z.string().min(5, 'La opinión debe tener al menos 5 caracteres').max(1000, 'La opinión es demasiado larga (máximo 1000 caracteres)'),
})

export type ReviewInput = z.infer<typeof reviewSchema>

// ─── Weekly Checkin Schema ────────────────────────────────────

export const weeklyCheckinSchema = z.object({
  weekLabel: z.string().regex(/^\d{4}-W\d{2}$/, 'Formato inválido (debe ser YYYY-WNN)'),
  dietAdherence: z.number().min(1).max(5),
  energyLevel: z.number().min(1).max(5),
  hungerLevel: z.number().min(1).max(5).nullable().optional(),
  mood: z.number().min(1).max(5).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

export type WeeklyCheckinInput = z.infer<typeof weeklyCheckinSchema>

