import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return 'Ahora mismo'
  if (diffMins < 60) return `Hace ${diffMins} min`
  if (diffHours < 24) return `Hace ${diffHours}h`
  if (diffDays < 7) return `Hace ${diffDays} días`
  return formatShortDate(dateStr)
}

export function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.[0] ?? ''
  const l = lastName?.[0] ?? ''
  return (f + l).toUpperCase() || '?'
}

export function getAvatarUrl(avatarUrl?: string | null, seed?: string | null): string {
  if (avatarUrl) return avatarUrl
  const cleanSeed = encodeURIComponent(seed || 'default')
  return `https://api.dicebear.com/10.x/thumbs/svg?seed=${cleanSeed}`
}

export const DAYS_ES: Record<string, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
}

export const MEAL_TYPES_ES: Record<string, string> = {
  breakfast: 'Desayuno',
  mid_morning: 'Media Mañana',
  lunch: 'Comida',
  snack: 'Merienda',
  dinner: 'Cena',
}

export const APPOINTMENT_STATUS_ES: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
}

export const LEVEL_ES: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

// ─── Diet Parsing Types & Helpers ──────────────────────────────────────────

export type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
export type MealKey = 'breakfast' | 'mid_morning' | 'lunch' | 'snack' | 'dinner'

export type WeeklyPlan = Record<DayKey, Record<MealKey, string>>

export interface DietContent {
  version: 1
  weeklyPlan: WeeklyPlan
  notes: string
}

export interface MealDetail {
  text: string
  macros: {
    protein: number
    carbs: number
    fat: number
    calories: number
  }
}

export type WeeklyPlanV2 = Record<DayKey, {
  meals: Record<MealKey, MealDetail>
  dayTotals: {
    protein: number
    carbs: number
    fat: number
    calories: number
  }
}>

export interface DietContentV2 {
  version: 2
  weeklyPlan: WeeklyPlanV2
  notes: string
}

export function parseDietContent(raw: string): DietContent | DietContentV2 | null {
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.version === 2 && parsed?.weeklyPlan) {
      return parsed as DietContentV2
    }
    if (parsed?.version === 1 && parsed?.weeklyPlan) {
      return parsed as DietContent
    }
  } catch {
    // fall through
  }
  return null
}

export function getDietAverageCalories(dietContentRaw: string, fallbackCalories?: number | null): number {
  const parsed = parseDietContent(dietContentRaw)
  if (parsed && parsed.version === 2 && parsed.weeklyPlan) {
    let totalKcal = 0
    let count = 0
    const dayKeys: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    dayKeys.forEach((key) => {
      const kcal = parsed.weeklyPlan[key]?.dayTotals?.calories
      if (typeof kcal === 'number' && kcal > 0) {
        totalKcal += kcal
        count++
      }
    })
    if (count > 0) {
      return Math.round(totalKcal / count)
    }
  }
  return fallbackCalories || 0
}


