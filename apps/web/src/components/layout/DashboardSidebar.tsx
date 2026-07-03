'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  Utensils,
  Calendar,
  Dumbbell,
  MessageSquare,
  LogOut,
  LineChart,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useSidebarStore } from '@/components/layout/DashboardHeader'
import { useClientDashboardStore, useAdminDashboardStore } from '@/features/dashboard/store/dashboardStore'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { Logo } from './Logo'

const clientNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, minPlan: null },
  { href: '/dashboard/cuestionario', label: 'Cuestionario', icon: ClipboardList, minPlan: 'basico' },
  { href: '/dashboard/dietas', label: 'Mis Dietas', icon: Utensils, minPlan: 'basico' },
  { href: '/dashboard/rutinas', label: 'Mis Rutinas', icon: Dumbbell, minPlan: 'pro' },
  { href: '/dashboard/progreso', label: 'Mi Progreso', icon: LineChart, minPlan: 'basico' },
  { href: '/dashboard/citas', label: 'Mis Citas', icon: Calendar, minPlan: 'basico' },
  { href: '/dashboard/chat', label: 'Chat Dietista', icon: MessageSquare, minPlan: 'basico' },
]

function getPlanLevel(plan: string | null | undefined): number {
  if (!plan) return 0
  if (plan === 'basico') return 1
  if (plan === 'pro') return 2
  if (plan === 'elite') return 3
  return 0
}

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { isOpen, setOpen } = useSidebarStore()
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 80)
    return () => clearTimeout(timer)
  }, [])

  const handleLogout = async () => {
    await logout()
    useClientDashboardStore.getState().clear()
    useAdminDashboardStore.getState().clear()
    toast({ title: 'Sesión cerrada', description: 'Hasta pronto' })
    router.push('/')
  }

  const userPlanLevel = getPlanLevel(user?.plan)
  const visibleNavItems = user?.plan
    ? clientNavItems.filter((item) => {
        if (item.minPlan === null) return true
        return getPlanLevel(item.minPlan) <= userPlanLevel
      })
    : [] // Sin plan: no mostramos items de navegación

  // Tarjeta con hover effects
  const cardClass = 'bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl shadow-black/5 hover:shadow-2xl hover:shadow-black/10 transition-all duration-300'

  const NavContent = ({ animate = false }: { animate?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo — mismo estilo cabecera que login */}
      <div
        className={cn(
          'p-6 border-b border-white/30 transition-all duration-700 ease-out',
          animate ? (revealed ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3') : 'opacity-100'
        )}
      >
        <Link href="/">
          <Logo showText={true} textClassName="text-xl" />
        </Link>
        <p className="text-xs text-[#2D1E1B]/50 mt-1.5 truncate font-medium">{user?.email}</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {user?.plan &&
          visibleNavItems.map((item, index) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                style={animate ? {
                  animation: revealed
                    ? `sidebarReveal 0.5s cubic-bezier(0.16,1,0.3,1) ${index * 70 + 150}ms both`
                    : 'none'
                } : {}}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 group',
                  isActive
                    ? 'bg-white text-[#2D1E1B] shadow-md border border-white/60 hover:shadow-lg hover:-translate-y-0.5'
                    : 'text-[#2D1E1B]/70 hover:bg-white/60 hover:text-[#2D1E1B] hover:translate-x-1 hover:shadow-sm'
                )}
              >
                <item.icon className={cn(
                  'h-4 w-4 shrink-0 transition-transform duration-300',
                  isActive ? 'text-primary' : 'text-[#2D1E1B]/50 group-hover:text-primary group-hover:scale-110'
                )} />
                {item.label}
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow shadow-primary/50" />
                )}
              </Link>
            )
          })}
      </nav>

      {/* Logout */}
      <div
        className={cn(
          'p-4 border-t border-white/30 transition-all duration-700 ease-out delay-700',
          animate ? (revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3') : 'opacity-100'
        )}
      >
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 rounded-full px-4 text-[#2D1E1B]/70 hover:bg-white/60 hover:text-destructive hover:shadow-sm transition-all duration-300 hover:translate-x-1"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-30">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          {/* Drawer panel */}
          <div className={cn('absolute top-0 left-0 w-64 h-full flex flex-col pt-14 rounded-r-2xl z-10 isolate', cardClass)}>
            <NavContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden lg:flex w-64 flex-col fixed inset-y-4 left-4 z-20 rounded-2xl',
        cardClass
      )}>
        <NavContent />
      </aside>
    </>
  )
}
