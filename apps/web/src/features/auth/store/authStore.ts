'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '@nutripro/shared'
import { authApi } from '@/lib/api'

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  setUser: (user: User | null) => void
  setAccessToken: (token: string | null) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
  fetchMe: () => Promise<void>
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAccessToken: (accessToken) => set({ accessToken }),

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const result = await authApi.login({ email, password })
          set({
            user: result.user,
            accessToken: result.accessToken,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      logout: async () => {
        try {
          await authApi.logout()
        } catch {
          // Continue even if logout fails
        } finally {
          set({ user: null, accessToken: null, isAuthenticated: false })
        }
      },

      refreshToken: async () => {
        try {
          const result = await authApi.refresh()
          if (result?.accessToken) {
            set({ accessToken: result.accessToken })
            return true
          }
          return false
        } catch {
          get().clear()
          return false
        }
      },

      fetchMe: async () => {
        set({ isLoading: true })
        try {
          const user = await authApi.me()
          set({ user, isAuthenticated: true, isLoading: false })
        } catch {
          get().clear()
          set({ isLoading: false })
        }
      },

      clear: () => set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    {
      name: 'nutripro-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
