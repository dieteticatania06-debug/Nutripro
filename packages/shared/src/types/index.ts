// ============================================================
// SHARED TYPES — @nutripro/shared
// ============================================================

// ─── User & Auth ─────────────────────────────────────────────

export type UserRole = 'admin' | 'client'

export interface User {
  id: string
  email: string
  role: UserRole
  emailVerified: boolean
  plan: 'basico' | 'pro' | 'elite' | null
  createdAt: string
  updatedAt: string
}

export interface AuthTokenPayload {
  sub: string // user id
  email: string
  role: UserRole
  iat: number
  exp: number
}

export interface LoginResponse {
  user: User
  accessToken: string
}

// ─── Profile ─────────────────────────────────────────────────

export interface Profile {
  id: string
  userId: string
  firstName: string
  lastName: string
  phone: string | null
  birthDate: string | null
  gender: 'male' | 'female' | 'other' | null
  height: number | null // cm
  weight: number | null // kg
  goal: string | null
  allergies: string | null
  observations: string | null
  avatarUrl: string | null
  theme?: 'light' | 'dark'
  createdAt: string
  updatedAt: string
}

// ─── Questionnaire ───────────────────────────────────────────

export interface Questionnaire {
  id: string
  userId: string
  objectives: string
  eatingHabits: string
  restrictions: string
  schedule: string
  sportsExperience: string
  observations: string | null
  submittedAt: string
}

// ─── Diet ────────────────────────────────────────────────────

export type DietStatus = 'active' | 'archived'

export interface Diet {
  id: string
  userId: string
  title: string
  description: string | null
  content: string // JSON or markdown
  totalCalories: number | null
  status: DietStatus
  assignedAt: string
  createdAt: string
  updatedAt: string
}



// ─── Workout ──────────────────────────────────────────────────

export type WorkoutStatus = 'active' | 'archived'

export interface WorkoutExercise {
  id: string
  workoutId: string
  name: string
  sets: number | null
  reps: string | null // "8-12" or "12"
  rest: string | null // "60s"
  notes: string | null
  order: number
  day: string | null
}

export interface Workout {
  id: string
  userId: string
  title: string
  description: string | null
  daysPerWeek: number | null
  duration: number | null // minutes
  level: 'beginner' | 'intermediate' | 'advanced' | null
  status: WorkoutStatus
  exercises: WorkoutExercise[]
  assignedAt: string
  createdAt: string
  updatedAt: string
}

// ─── Appointments ─────────────────────────────────────────────

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export interface Appointment {
  id: string
  userId: string
  title: string
  date: string // ISO date
  startTime: string // "HH:MM"
  endTime: string // "HH:MM"
  status: AppointmentStatus
  notes: string | null
  adminNotes: string | null
  createdAt: string
  updatedAt: string
}

export interface AppointmentSlot {
  id: string
  date: string
  startTime: string
  endTime: string
  isAvailable: boolean
}

// ─── Progress ─────────────────────────────────────────────────

export interface ProgressRecord {
  id: string
  userId: string
  recordedAt: string // ISO date
  weight: number | null // kg
  bodyFat: number | null // %
  chest: number | null // cm
  waist: number | null // cm
  hips: number | null // cm
  arms: number | null // cm
  thighs: number | null // cm
  notes: string | null
  createdAt: string
}

// ─── Chat & Messages ──────────────────────────────────────────

export interface Chat {
  id: string
  userId: string
  createdAt: string
  updatedAt: string
  lastMessageAt: string | null
  unreadByAdmin: number
  unreadByClient: number
}

export type MessageSender = 'client' | 'admin'

export interface Message {
  id: string
  chatId: string
  senderId: string
  senderRole: MessageSender
  content: string
  readAt: string | null
  createdAt: string
}

// ─── Notifications ────────────────────────────────────────────

export type NotificationType =
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'new_diet'
  | 'new_workout'
  | 'new_message'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  readAt: string | null
  relatedId: string | null
  createdAt: string
}

// ─── Reviews ──────────────────────────────────────────────────

export interface Review {
  id: string
  userId: string
  rating: number
  content: string
  createdAt: string
  firstName?: string
  lastName?: string
  avatarUrl?: string | null
  email?: string
}

// ─── Weekly Checkins ──────────────────────────────────────────

export interface WeeklyCheckin {
  id: string
  userId: string
  weekLabel: string      // "2026-W26" (ISO year-week)
  dietAdherence: number  // 1-5
  energyLevel: number    // 1-5
  hungerLevel: number | null
  mood: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

// ─── API Response ─────────────────────────────────────────────


export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
