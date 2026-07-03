// API client for communicating with the Cloudflare Worker
// All requests are typed and share centralized error handling

import type { 
  User, Profile, Diet, Workout, 
  Appointment, AppointmentSlot, ProgressRecord, 
  Chat, Message, Questionnaire, PaginatedResponse,
  Review, WeeklyCheckin
} from '@nutripro/shared'

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL ?? 'http://127.0.0.1:8787'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface FetchOptions extends RequestInit {
  auth?: boolean
}

function cleanParams(params?: Record<string, any>): Record<string, string> {
  const clean: Record<string, string> = {}
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        clean[k] = String(v)
      }
    })
  }
  return clean
}


async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { auth: _, ...fetchOptions } = options
  const url = `${WORKER_URL}${path}`

  const response = await fetch(url, {
    ...fetchOptions,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  })

  if (response.status === 204) return undefined as T

  let data = await response.json().catch(() => ({ success: false, error: 'Error de servidor' }))

  if (response.status === 401 && path !== '/auth/refresh' && path !== '/auth/login') {
    let refreshed = false
    try {
      const refreshResponse = await fetch(`${WORKER_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json()
        const newAccessToken = refreshData.data?.accessToken
        if (newAccessToken) {
          refreshed = true
          if (typeof window !== 'undefined') {
            const { useAuthStore } = await import('@/features/auth/store/authStore')
            useAuthStore.getState().setAccessToken(newAccessToken)
          }

          // Retry the original request
          const retryResponse = await fetch(url, {
            ...fetchOptions,
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              ...fetchOptions.headers,
            },
          })
          if (retryResponse.status === 204) return undefined as T
          data = await retryResponse.json().catch(() => ({ success: false, error: 'Error de servidor' }))
          if (!retryResponse.ok) {
            throw new ApiError(retryResponse.status, data.error ?? 'Error desconocido', data.errors)
          }
          return data.data as T
        }
      }
    } catch (e) {
      console.error('Error in apiFetch token refresh:', e)
    }

    if (!refreshed) {
      if (typeof window !== 'undefined') {
        const { useAuthStore } = await import('@/features/auth/store/authStore')
        useAuthStore.getState().clear()
      }
      throw new ApiError(401, 'Sesión expirada')
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, data.error ?? 'Error desconocido', data.errors)
  }

  return data.data as T
}

// ─── Auth ──────────────────────────────────────────────────────
export const authApi = {
  register: (body: unknown) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: unknown) =>
    apiFetch<{ user: User; accessToken: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(body) }
    ),

  logout: () =>
    apiFetch('/auth/logout', { method: 'POST' }),

  refresh: () =>
    apiFetch<{ accessToken: string }>('/auth/refresh', { method: 'POST' }),

  me: () =>
    apiFetch<User>('/auth/me'),

  verifyEmail: (token: string) =>
    apiFetch('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }),

  forgotPassword: (email: string) =>
    apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (body: unknown) =>
    apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
}

// ─── Profile ───────────────────────────────────────────────────
export const profileApi = {
  get: () =>
    apiFetch<Profile>('/users/profile'),

  update: (body: unknown) =>
    apiFetch<Profile>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  uploadAvatar: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return fetch(`${WORKER_URL}/users/avatar`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': file.type },
      body: file,
    }).then((r) => r.json())
  },

  deleteAvatar: () =>
    apiFetch<{ avatarUrl: null }>('/users/avatar', {
      method: 'DELETE',
    }),
}

// ─── Diets ─────────────────────────────────────────────────────
export const dietsApi = {
  list: (userId?: string) =>
    apiFetch<Diet[]>(userId ? `/diets/?userId=${userId}` : '/diets/'),

  getActive: (userId?: string) =>
    apiFetch<Diet | null>(
      userId ? `/diets/active?userId=${userId}` : '/diets/active'
    ),

  get: (id: string) =>
    apiFetch<Diet>(`/diets/${id}`),

  create: (body: unknown) =>
    apiFetch<Diet>('/diets/', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: string, body: unknown) =>
    apiFetch<Diet>(`/diets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    apiFetch(`/diets/${id}`, { method: 'DELETE' }),

  generateAi: (userId: string) =>
    apiFetch<Diet>('/diets/generate-ai', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  recalculateMacros: (meals: { day: string; meal: string; text: string }[]) =>
    apiFetch<{
      meals: {
        day: string
        meal: string
        text: string
        macros: {
          protein: number
          carbs: number
          fat: number
          calories: number
        }
      }[]
    }>('/diets/recalculate-macros', {
      method: 'POST',
      body: JSON.stringify({ meals }),
    }),
}



// ─── Workouts ──────────────────────────────────────────────────
export const workoutsApi = {
  list: (userId?: string) =>
    apiFetch<Workout[]>(userId ? `/workouts/?userId=${userId}` : '/workouts/'),

  getActive: (userId?: string) =>
    apiFetch<Workout | null>(
      userId ? `/workouts/active?userId=${userId}` : '/workouts/active'
    ),

  get: (id: string) =>
    apiFetch<Workout>(`/workouts/${id}`),

  create: (body: unknown) =>
    apiFetch<Workout>('/workouts/', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: string, body: unknown) =>
    apiFetch<Workout>(`/workouts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    apiFetch(`/workouts/${id}`, { method: 'DELETE' }),

  generateAi: (userId: string) =>
    apiFetch<Workout>('/workouts/generate-ai', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
}

// ─── Appointments ──────────────────────────────────────────────
export const appointmentsApi = {
  list: (params?: { date?: string; status?: string }) => {
    const q = new URLSearchParams(cleanParams(params)).toString()
    return apiFetch<Appointment[]>(`/appointments/${q ? '?' + q : ''}`)
  },

  getAvailable: (date: string) =>
    apiFetch<AppointmentSlot[]>(`/appointments/available?date=${date}`),

  create: (body: unknown) =>
    apiFetch<Appointment>('/appointments/', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: string, body: unknown) =>
    apiFetch<Appointment>(`/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  cancel: (id: string) =>
    apiFetch(`/appointments/${id}`, { method: 'DELETE' }),
}

// ─── Progress ──────────────────────────────────────────────────
export const progressApi = {
  list: (userId?: string) =>
    apiFetch<ProgressRecord[]>(
      userId ? `/progress/?userId=${userId}` : '/progress/'
    ),

  create: (body: unknown) =>
    apiFetch<ProgressRecord>('/progress/', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    apiFetch(`/progress/${id}`, { method: 'DELETE' }),
}

// ─── Chat ──────────────────────────────────────────────────────
export const chatApi = {
  getChat: () =>
    apiFetch<Chat>('/chat/'),

  getAllChats: () =>
    apiFetch<(Chat & { firstName: string; lastName: string; email: string })[]>('/chat/'),

  getMessages: (chatId: string) =>
    apiFetch<Message[]>(`/chat/${chatId}/messages`),

  sendMessage: (chatId: string, content: string) =>
    apiFetch<Message>(`/chat/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  getChatByUser: (userId: string) =>
    apiFetch<Chat>(`/chat/by-user/${userId}`),
}

// ─── Questionnaires ────────────────────────────────────────────
export const questionnairesApi = {
  list: () =>
    apiFetch<Questionnaire[]>('/questionnaires/'),

  get: (id: string) =>
    apiFetch<Questionnaire>(`/questionnaires/${id}`),

  create: (body: unknown) =>
    apiFetch<Questionnaire>('/questionnaires/', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}

// ─── Admin Users ───────────────────────────────────────────────
export const adminUsersApi = {
  list: (params?: { search?: string; page?: number }) => {
    const q = new URLSearchParams(cleanParams(params)).toString()
    return apiFetch<PaginatedResponse<unknown>>(`/users/${q ? '?' + q : ''}`)
  },

  get: (id: string) =>
    apiFetch(`/users/${id}`),

  delete: (id: string) =>
    apiFetch(`/users/${id}`, { method: 'DELETE' }),

  assignPlan: (userId: string, plan: 'basico' | 'pro' | 'elite' | null) =>
    apiFetch(`/users/${userId}/plan`, { method: 'PATCH', body: JSON.stringify({ plan }) }),
}

// ─── Admin Stats ───────────────────────────────────────────────
export const adminApi = {
  stats: () =>
    apiFetch<{
      totalClients: number
      pendingAppointments: number
      totalQuestionnaires: number
      unreadMessages: number
    }>('/admin/stats'),
}

// ─── Email / Contact ───────────────────────────────────────────
export const emailApi = {
  contact: (body: unknown) =>
    apiFetch('/email/contact', { method: 'POST', body: JSON.stringify(body) }),
}

// ─── Reviews ───────────────────────────────────────────────────
export const reviewsApi = {
  list: () =>
    apiFetch<Review[]>('/reviews/'),

  create: (body: { rating: number; content: string }) =>
    apiFetch<Review>('/reviews/', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    apiFetch(`/reviews/${id}`, { method: 'DELETE' }),
}

// ─── Weekly Checkins ───────────────────────────────────────────
export const checkinsApi = {
  list: (userId?: string) =>
    apiFetch<WeeklyCheckin[]>(`/checkins/${userId ? '?userId=' + userId : ''}`),

  create: (body: {
    weekLabel: string
    dietAdherence: number
    energyLevel: number
    hungerLevel?: number | null
    mood?: number | null
    notes?: string | null
  }) =>
    apiFetch<WeeklyCheckin>('/checkins/', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}
