'use client'

import { DashboardSidebar } from '@/components/layout/DashboardSidebar'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useClientDashboardStore } from '@/features/dashboard/store/dashboardStore'
import { Loader } from '@/components/ui/loader'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// Rutas permitidas aunque el usuario no tenga plan
const ALLOWED_WITHOUT_PLAN = ['/dashboard/perfil']

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore()
  const { fetchData, isLoaded } = useClientDashboardStore()
  const pathname = usePathname()
  const router = useRouter()
  // Wait for Zustand persist to rehydrate from localStorage before acting
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    // If no valid session at all, redirect to login immediately
    if (!isAuthenticated || !user) {
      router.replace('/auth/login')
      return
    }

    const noPlan = !user.plan
    const isAllowed = ALLOWED_WITHOUT_PLAN.some((p) => pathname.startsWith(p))

    if (noPlan && !isAllowed) {
      router.replace('/precios')
      return
    }

    // Prefetch all dashboard data
    fetchData()

    if (user.role === 'admin') return

    // Plan básico no puede ver rutinas
    if (user.plan === 'basico' && pathname.startsWith('/dashboard/rutinas')) {
      router.replace('/dashboard')
    }
  }, [mounted, user, isAuthenticated, pathname, router, fetchData])

  // While Zustand is still rehydrating, show a neutral loader
  if (!mounted) {
    return <Loader label="Cargando..." fullScreen />
  }

  // Show loader while redirect fires (avoids flashing protected content)
  if (!isAuthenticated || !user) {
    return <Loader label="Redirigiendo..." fullScreen />
  }

  const noPlan = !user.plan
  const isAllowed = ALLOWED_WITHOUT_PLAN.some((p) => pathname.startsWith(p))

  if (noPlan && !isAllowed) {
    return <Loader label="Redirigiendo a planes..." fullScreen />
  }

  if (!isLoaded) {
    return <Loader label="Cargando tu panel personalizado..." fullScreen />
  }

  return (
    <div className="h-screen bg-gradient-to-tr from-[#4A7C59] via-[#EBF3EB] to-[#2C5E43] relative overflow-hidden">
      {/* Mismo fondo que auth layout para que la tarjeta glassmorphism se vea igual que el login */}
      <div className="absolute top-[10%] right-[10%] w-[500px] h-[500px] rounded-full bg-[#3A875A]/40 blur-[130px] pointer-events-none animate-pulse" style={{ animationDuration: '7s' }} />
      <div className="absolute bottom-[10%] left-[10%] w-[550px] h-[550px] rounded-full bg-amber-400/30 blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />
      <div className="absolute top-[35%] left-[25%] w-[400px] h-[400px] rounded-full bg-[#FAF3EC]/50 blur-[90px] pointer-events-none" />

      <DashboardSidebar />
      <div className="lg:pl-[18rem] flex flex-col h-screen relative z-10 overflow-hidden">
        <DashboardHeader />
        <main className="flex-grow min-h-0 overflow-y-auto p-6 max-w-[90rem] w-full mx-auto">
          <div key={pathname} className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
