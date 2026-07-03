'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, CalendarCheck, ClipboardList, MessageSquare } from 'lucide-react'
import Link from 'next/link'

import { useAdminDashboardStore } from '@/features/dashboard/store/dashboardStore'

interface Stats {
  totalClients: number
  pendingAppointments: number
  totalQuestionnaires: number
  unreadMessages: number
}

export default function AdminDashboardPage() {
  const { stats: storeStats, isLoaded } = useAdminDashboardStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(!isLoaded)

  useEffect(() => {
    if (isLoaded) {
      setStats(storeStats)
      setIsLoading(false)
    }
  }, [isLoaded, storeStats])

  const cards = [
    { title: 'Clientes Registrados', value: stats?.totalClients ?? 0, icon: Users, href: '/admin/clientes', color: 'text-blue-600', bgClass: 'bg-blue-500/10 hover:bg-blue-500/15 border-blue-200/30 shadow-blue-950/[0.01]' },
    { title: 'Citas Pendientes', value: stats?.pendingAppointments ?? 0, icon: CalendarCheck, href: '/admin/citas', color: 'text-orange-600', bgClass: 'bg-orange-500/10 hover:bg-orange-500/15 border-orange-200/30 shadow-orange-950/[0.01]' },
    { title: 'Formularios Recibidos', value: stats?.totalQuestionnaires ?? 0, icon: ClipboardList, href: '/admin/formularios', color: 'text-purple-600', bgClass: 'bg-purple-500/10 hover:bg-purple-500/15 border-purple-200/30 shadow-purple-950/[0.01]' },
    { title: 'Mensajes Sin Leer', value: stats?.unreadMessages ?? 0, icon: MessageSquare, href: '/admin/chat', color: 'text-green-600', bgClass: 'bg-green-500/10 hover:bg-green-500/15 border-green-200/30 shadow-green-950/[0.01]' },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Panel de Administración</h1>
        <p className="text-sm text-muted-foreground">Resumen general de NutriPro</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="group">
            <div className={`backdrop-blur-xl border shadow-xl hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 rounded-[2rem] p-8 flex flex-col justify-between h-48 ${card.bgClass}`}>
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-foreground/80">{card.title}</span>
                <div className={`p-3 rounded-full bg-white/45 shadow-sm group-hover:scale-110 transition-transform ${card.color}`}>
                  <card.icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4">
                {isLoading ? (
                  <div className="h-10 w-20 bg-muted/30 rounded animate-pulse" />
                ) : (
                  <div className="text-5xl font-black text-foreground">{card.value}</div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
