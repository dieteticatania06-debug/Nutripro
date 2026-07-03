'use client'

import { create } from 'zustand'
import { dietsApi, workoutsApi, appointmentsApi, profileApi, questionnairesApi, chatApi, adminApi, adminUsersApi, progressApi, checkinsApi } from '@/lib/api'
import type { Profile, Diet, Workout, Appointment, Questionnaire, Chat, Message, ProgressRecord, WeeklyCheckin } from '@nutripro/shared'
import { useAuthStore } from '@/features/auth/store/authStore'

interface AdminStats {
  totalClients: number
  pendingAppointments: number
  totalQuestionnaires: number
  unreadMessages: number
}

interface ClientDashboardState {
  profile: Profile | null
  activeDiet: Diet | null
  allDiets: Diet[]
  activeWorkout: Workout | null
  allWorkouts: Workout[]
  appointments: Appointment[]
  questionnaires: Questionnaire[]
  chat: Chat | null
  messages: Message[]
  progressRecords: ProgressRecord[]
  weeklyCheckins: WeeklyCheckin[]
  isLoading: boolean
  isLoaded: boolean
  error: string | null

  fetchData: (force?: boolean) => Promise<void>
  reloadAppointments: () => Promise<void>
  reloadQuestionnaires: () => Promise<void>
  reloadDiets: () => Promise<void>
  reloadWorkouts: () => Promise<void>
  reloadChat: () => Promise<void>
  reloadMessages: () => Promise<void>
  reloadProgress: () => Promise<void>
  reloadCheckins: () => Promise<void>
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void
  clear: () => void
}

interface AdminDashboardState {
  stats: AdminStats | null
  clients: any[]
  diets: Diet[]
  workouts: Workout[]
  appointments: any[]
  questionnaires: any[]
  chats: any[]
  isLoading: boolean
  isLoaded: boolean
  clientsLoaded: boolean
  dietsLoaded: boolean
  workoutsLoaded: boolean
  appointmentsLoaded: boolean
  questionnairesLoaded: boolean
  chatsLoaded: boolean
  error: string | null

  fetchData: (force?: boolean) => Promise<void>
  reloadStats: () => Promise<void>
  reloadClients: () => Promise<void>
  reloadDiets: () => Promise<void>
  reloadWorkouts: () => Promise<void>
  reloadAppointments: () => Promise<void>
  reloadChats: () => Promise<void>
  reloadQuestionnaires: () => Promise<void>
  clear: () => void
}

export const useClientDashboardStore = create<ClientDashboardState>((set, get) => ({
  profile: null,
  activeDiet: null,
  allDiets: [],
  activeWorkout: null,
  allWorkouts: [],
  appointments: [],
  questionnaires: [],
  chat: null,
  messages: [],
  progressRecords: [],
  weeklyCheckins: [],
  isLoading: false,
  isLoaded: false,
  error: null,

  fetchData: async (force = false) => {
    if (get().isLoaded && !force) return

    set({ isLoading: true, error: null })
    try {
      const [prof, activeDiet, allDiets, activeWorkout, allWorkouts, appts, quests, chat] = await Promise.all([
        profileApi.get().catch(() => null),
        dietsApi.getActive().catch(() => null),
        dietsApi.list().catch(() => []),
        workoutsApi.getActive().catch(() => null),
        workoutsApi.list().catch(() => []),
        appointmentsApi.list().catch(() => []),
        questionnairesApi.list().catch(() => []),
        chatApi.getChat().catch(() => null),
      ])

      let messages: Message[] = []
      let progressRecords: ProgressRecord[] = []

      // Load progress and check-ins only if user plan is pro or elite
      const user = useAuthStore.getState().user
      let weeklyCheckins: WeeklyCheckin[] = []
      if (user && (user.plan === 'pro' || user.plan === 'elite')) {
        progressRecords = await progressApi.list().catch(() => [])
        weeklyCheckins = await checkinsApi.list().catch(() => [])
      }

      if (chat) {
        messages = await chatApi.getMessages(chat.id).catch(() => [])
      }

      set({
        profile: prof,
        activeDiet: activeDiet as Diet | null,
        allDiets: allDiets as Diet[],
        activeWorkout: activeWorkout as Workout | null,
        allWorkouts: allWorkouts as Workout[],
        appointments: appts as Appointment[],
        questionnaires: quests as Questionnaire[],
        chat: chat as Chat | null,
        messages: messages as Message[],
        progressRecords: progressRecords as ProgressRecord[],
        weeklyCheckins: weeklyCheckins as WeeklyCheckin[],
        isLoading: false,
        isLoaded: true,
      })
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Error al cargar los datos' })
    }
  },

  reloadAppointments: async () => {
    const data = await appointmentsApi.list().catch(() => [])
    set({ appointments: data as Appointment[] })
  },

  reloadQuestionnaires: async () => {
    const data = await questionnairesApi.list().catch(() => [])
    set({ questionnaires: data as Questionnaire[] })
  },

  reloadDiets: async () => {
    const [active, all] = await Promise.all([
      dietsApi.getActive().catch(() => null),
      dietsApi.list().catch(() => []),
    ])
    set({ activeDiet: active as Diet | null, allDiets: all as Diet[] })
  },

  reloadWorkouts: async () => {
    const [active, all] = await Promise.all([
      workoutsApi.getActive().catch(() => null),
      workoutsApi.list().catch(() => []),
    ])
    set({ activeWorkout: active as Workout | null, allWorkouts: all as Workout[] })
  },

  reloadChat: async () => {
    const chat = await chatApi.getChat().catch(() => null)
    let messages: Message[] = []
    if (chat) {
      messages = await chatApi.getMessages(chat.id).catch(() => [])
    }
    set({ chat: chat as Chat | null, messages: messages as Message[] })
  },

  reloadMessages: async () => {
    const chat = get().chat
    if (chat) {
      const messages = await chatApi.getMessages(chat.id).catch(() => [])
      set({ messages: messages as Message[] })
    }
  },

  reloadProgress: async () => {
    const data = await progressApi.list().catch(() => [])
    set({ progressRecords: data as ProgressRecord[] })
  },

  reloadCheckins: async () => {
    const data = await checkinsApi.list().catch(() => [])
    set({ weeklyCheckins: data as WeeklyCheckin[] })
  },

  setMessages: (messagesOrFn) => {
    if (typeof messagesOrFn === 'function') {
      set((state) => ({ messages: messagesOrFn(state.messages) }))
    } else {
      set({ messages: messagesOrFn })
    }
  },

  clear: () => set({
    profile: null,
    activeDiet: null,
    allDiets: [],
    activeWorkout: null,
    allWorkouts: [],
    appointments: [],
    questionnaires: [],
    chat: null,
    messages: [],
    progressRecords: [],
    isLoading: false,
    isLoaded: false,
    error: null,
  })
}))

export const useAdminDashboardStore = create<AdminDashboardState>((set, get) => ({
  stats: null,
  clients: [],
  diets: [],
  workouts: [],
  appointments: [],
  questionnaires: [],
  chats: [],
  isLoading: false,
  isLoaded: false,
  clientsLoaded: false,
  dietsLoaded: false,
  workoutsLoaded: false,
  appointmentsLoaded: false,
  questionnairesLoaded: false,
  chatsLoaded: false,
  error: null,

  fetchData: async (force = false) => {
    if (get().isLoaded && !force) return

    set({ isLoading: true, error: null })
    try {
      const stats = await adminApi.stats().catch(() => null)

      set({
        stats,
        isLoading: false,
        isLoaded: true,
      })
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Error al cargar los datos de administración' })
    }
  },

  reloadStats: async () => {
    const stats = await adminApi.stats().catch(() => null)
    set({ stats })
  },

  reloadClients: async () => {
    const usersData = await adminUsersApi.list({ page: 1 } as any).catch(() => ({ items: [] }))
    const rawClients = (usersData as { items: any[] }).items ?? []
    const clients = rawClients.filter((c) => c.role !== 'admin')
    set({ clients, clientsLoaded: true })
  },

  reloadDiets: async () => {
    const data = await dietsApi.list().catch(() => [])
    set({ diets: data as Diet[], dietsLoaded: true })
  },

  reloadWorkouts: async () => {
    const data = await workoutsApi.list().catch(() => [])
    set({ workouts: data as Workout[], workoutsLoaded: true })
  },

  reloadAppointments: async () => {
    const data = await appointmentsApi.list().catch(() => [])
    set({ appointments: data as any[], appointmentsLoaded: true })
  },

  reloadChats: async () => {
    const data = await chatApi.getAllChats().catch(() => [])
    set({ chats: data as any[], chatsLoaded: true })
  },

  reloadQuestionnaires: async () => {
    const data = await questionnairesApi.list().catch(() => [])
    set({ questionnaires: data as any[], questionnairesLoaded: true })
  },

  clear: () => set({
    stats: null,
    clients: [],
    diets: [],
    workouts: [],
    appointments: [],
    questionnaires: [],
    chats: [],
    isLoading: false,
    isLoaded: false,
    clientsLoaded: false,
    dietsLoaded: false,
    workoutsLoaded: false,
    appointmentsLoaded: false,
    questionnairesLoaded: false,
    chatsLoaded: false,
    error: null,
  })
}))
