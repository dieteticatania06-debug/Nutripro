'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Utensils,
  ClipboardList, Calendar, MessageSquare, LogOut,
  Activity, Dumbbell
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useClientDashboardStore, useAdminDashboardStore } from '@/features/dashboard/store/dashboardStore'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Logo } from './Logo'
import { useSidebarStore } from '@/components/layout/DashboardHeader'

const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
  { href: '/admin/dietas', label: 'Dietas', icon: Utensils },
  { href: '/admin/rutinas', label: 'Rutinas', icon: Dumbbell },
  { href: '/admin/progreso', label: 'Progreso', icon: Activity },
  { href: '/admin/formularios', label: 'Formularios', icon: ClipboardList },
  { href: '/admin/citas', label: 'Citas', icon: Calendar },
  { href: '/admin/chat', label: 'Chat', icon: MessageSquare },
]

export function AdminSidebar() {
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

  // Tarjeta con hover effects — igual que DashboardSidebar
  const cardClass = 'bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl shadow-black/5 hover:shadow-2xl hover:shadow-black/10 transition-all duration-300'

  const NavContent = ({ animate = false }: { animate?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className={cn(
          'p-6 border-b border-white/30 transition-all duration-700 ease-out',
          animate ? (revealed ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3') : 'opacity-100'
        )}
      >
        <Link href="/">
          <Logo showText={true} textClassName="text-xl" />
        </Link>
        <p className="text-xs font-bold uppercase tracking-wider text-primary mt-1.5">Admin Panel</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {adminNavItems.map((item, index) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
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
        <p className="text-xs text-[#2D1E1B]/40 mb-3 px-4 font-medium truncate">{user?.email}</p>
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
      {/* Mobile drawer — mismo patrón que DashboardSidebar */}
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
