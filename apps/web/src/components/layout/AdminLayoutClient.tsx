'use client'

import { useAdminDashboardStore } from '@/features/dashboard/store/dashboardStore'
import { useAuthStore } from '@/features/auth/store/authStore'
import { Loader } from '@/components/ui/loader'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const { fetchData, isLoaded } = useAdminDashboardStore()
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()
  // Wait for Zustand persist to rehydrate from sessionStorage before acting
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (!isAuthenticated || !user) {
      router.replace('/auth/login')
      return
    }
    if (user.role !== 'admin') {
      router.replace('/dashboard')
      return
    }
    fetchData()
  }, [mounted, isAuthenticated, user, router, fetchData])

  // While Zustand is still rehydrating, show a neutral loader
  if (!mounted) {
    return <Loader label="Cargando..." fullScreen />
  }

  // Show loader while redirect fires (avoids flashing protected content)
  if (!isAuthenticated || !user || user.role !== 'admin') {
    return <Loader label="Redirigiendo..." fullScreen />
  }

  if (!isLoaded) {
    return <Loader label="Cargando panel de administración..." fullScreen />
  }

  const pathname = usePathname()

  return (
    <div key={pathname} className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both">
      {children}
    </div>
  )
}
