'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { adminUsersApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { formatDate, getInitials, getAvatarUrl } from '@/lib/utils'
import Image from 'next/image'
import { Search, Trash2, MessageSquare, Crown, Shield, Activity, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { Loader } from '@/components/ui/loader'

interface ClientRow {
  id: string
  email: string
  role: string
  emailVerified: boolean
  createdAt: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  avatarUrl: string | null
  plan: 'basico' | 'pro' | 'elite' | null
}

const PLANS: {
  key: 'basico' | 'pro' | 'elite'
  label: string
  price: string
  description: string
  color: string
  ring: string
  icon: LucideIcon
  iconColor: string
  iconBg: string
}[] = [
  {
    key: 'basico',
    label: 'Básico',
    price: '15€/mes',
    description: 'Plan nutricional + seguimiento mensual + chat',
    color: 'bg-emerald-50/50 border-emerald-500/30 text-emerald-950',
    ring: 'ring-emerald-500/20',
    icon: Shield,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-100/60',
  },
  {
    key: 'pro',
    label: 'Pro',
    price: '25€/mes',
    description: 'Nutricional + rutina deportiva + seguimiento semanal',
    color: 'bg-orange-50/50 border-orange-500/30 text-orange-950',
    ring: 'ring-orange-500/20',
    icon: Activity,
    iconColor: 'text-orange-600',
    iconBg: 'bg-orange-100/60',
  },
]

const planBadgeProps: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' }> = {
  basico: { label: 'Básico', variant: 'default' },
  pro: { label: 'Pro', variant: 'warning' },
  elite: { label: 'Élite', variant: 'success' },
}

import { useAdminDashboardStore } from '@/features/dashboard/store/dashboardStore'

// ── Phase calculation (based on createdAt) ────────────────────
function getClientPhase(createdAt: string): { label: string; color: string; bg: string } {
  const weeks = Math.floor((Date.now() - new Date(createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000))
  if (weeks === 0) return { label: 'Nuevo', color: 'text-slate-600', bg: 'bg-slate-100' }
  if (weeks <= 4) return { label: 'Adaptación', color: 'text-blue-700', bg: 'bg-blue-100' }
  if (weeks <= 8) return { label: 'Progresión', color: 'text-amber-700', bg: 'bg-amber-100' }
  if (weeks <= 12) return { label: 'Mantenimiento', color: 'text-emerald-700', bg: 'bg-emerald-100' }
  const cycle = Math.floor(weeks / 12) + 1
  return { label: `Ciclo ${cycle}`, color: 'text-purple-700', bg: 'bg-purple-100' }
}

export default function AdminClientesPage() {
  const { clients: storeClients, isLoaded, reloadClients, clientsLoaded } = useAdminDashboardStore()
  const [clients, setClients] = useState<ClientRow[]>([])
  const [isLoading, setIsLoading] = useState(!clientsLoaded)
  const [search, setSearch] = useState('')
  const [clientToDelete, setClientToDelete] = useState<{ id: string; name: string } | null>(null)
  const [planModal, setPlanModal] = useState<{ id: string; name: string; currentPlan: ClientRow['plan'] } | null>(null)
  const [assigningPlan, setAssigningPlan] = useState(false)
  const [mounted, setMounted] = useState(false)

  const load = async (q?: string) => {
    setIsLoading(true)
    try {
      if (q) {
        const result = await adminUsersApi.list({ search: q })
        const rawItems = (result as { items: ClientRow[] }).items ?? []
        setClients(rawItems.filter((c) => c.role !== 'admin'))
      } else {
        await reloadClients()
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isLoaded) {
      if (!clientsLoaded) {
        load()
      } else {
        setClients(storeClients)
        setIsLoading(false)
      }
    }
  }, [isLoaded, clientsLoaded, storeClients])
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (clientToDelete || planModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [clientToDelete, planModal])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    load(search)
  }

  const handleDelete = (id: string, name: string) => {
    setClientToDelete({ id, name })
  }

  const confirmDelete = async () => {
    if (!clientToDelete) return
    try {
      await adminUsersApi.delete(clientToDelete.id)
      setClients((prev) => prev.filter((c) => c.id !== clientToDelete.id))
      toast({ title: 'Cliente eliminado' })
    } catch {
      toast({ title: 'Error al eliminar', variant: 'destructive' })
    } finally {
      setClientToDelete(null)
    }
  }

  const handleAssignPlan = async (plan: 'basico' | 'pro' | 'elite' | null) => {
    if (!planModal) return
    setAssigningPlan(true)
    try {
      await adminUsersApi.assignPlan(planModal.id, plan)
      setClients((prev) =>
        prev.map((c) => (c.id === planModal.id ? { ...c, plan } : c))
      )
      toast({ title: `Plan ${plan ? `"${plan}"` : 'eliminado'} asignado a ${planModal.name}` })
      setPlanModal(null)
    } catch {
      toast({ title: 'Error al asignar plan', variant: 'destructive' })
    } finally {
      setAssigningPlan(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">{clients.length} clientes registrados</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button type="submit">Buscar</Button>
        {search && <Button type="button" variant="outline" onClick={() => { setSearch(''); load() }}>Limpiar</Button>}
      </form>

      {isLoading ? (
        <Loader label="Cargando clientes..." />
      ) : (
        <div className="rounded-2xl border border-white/40 shadow-xl bg-white/45 backdrop-blur-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FAF3EC]/60 border-b border-white/30 text-foreground/80 backdrop-blur-md">
              <tr>
                <th className="text-left p-4 font-bold">Cliente</th>
                <th className="text-left p-4 font-bold">Email</th>
                <th className="text-center p-4 font-bold">Plan</th>
                <th className="text-center p-4 font-bold">Fase</th>
                <th className="text-center p-4 font-bold">Verificado</th>
                <th className="text-left p-4 font-bold">Registrado</th>
                <th className="text-right p-4 font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100/10">
              {clients.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No se encontraron clientes</td></tr>
              )}
              {clients.map((client) => {
                const name = [client.firstName, client.lastName].filter(Boolean).join(' ') || '—'
                return (
                  <tr key={client.id} className="hover:bg-primary/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20">
                          <Image
                            src={getAvatarUrl(client.avatarUrl, client.email)}
                            alt="Avatar"
                            fill
                            sizes="32px"
                            className="object-cover"
                          />
                        </div>
                        <span className="font-semibold">{name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{client.email}</td>
                    <td className="p-3 text-center">
                      {client.plan ? (
                        <div className="flex justify-center">
                          <Badge variant={planBadgeProps[client.plan]?.variant ?? 'default'} className="flex items-center gap-1.5 capitalize py-0.5 px-2.5 rounded-full font-medium">
                            {client.plan === 'elite' && <Crown className="h-3 w-3 text-amber-500" />}
                            {client.plan === 'pro' && <Activity className="h-3 w-3 text-orange-500" />}
                            {client.plan === 'basico' && <Shield className="h-3 w-3 text-emerald-500" />}
                            {planBadgeProps[client.plan]?.label}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin plan</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {(() => {
                        const phase = getClientPhase(client.createdAt)
                        return (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${phase.color} ${phase.bg}`}>
                            {phase.label}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="p-3 text-center">
                      {client.emailVerified
                        ? <Badge variant="success">✓</Badge>
                        : <Badge variant="warning">Pendiente</Badge>}
                    </td>
                    <td className="p-3 text-muted-foreground">{formatDate(client.createdAt)}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Asignar plan */}
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Asignar plan"
                          className="text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                          onClick={() => setPlanModal({ id: client.id, name, currentPlan: client.plan })}
                        >
                          <Crown className="h-4 w-4" />
                        </Button>
                        {/* Chat */}
                        <Button asChild size="icon" variant="ghost" title="Ver chat">
                          <Link href={`/admin/chat?userId=${client.id}`}>
                            <MessageSquare className="h-4 w-4" />
                          </Link>
                        </Button>
                        {/* Eliminar */}
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Eliminar"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(client.id, name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal asignar plan ─────────────────────────────────────────────── */}
      {mounted && planModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1E110A]/40 backdrop-blur-md animate-in fade-in duration-200 p-4">
          <div className="bg-white/90 border border-orange-100/40 shadow-2xl rounded-2xl max-w-md w-full p-6 backdrop-blur-xl animate-in zoom-in-95 duration-200 space-y-5">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                Asignar plan a <span className="text-primary">{planModal.name}</span>
              </h3>
              <p className="text-xs text-muted-foreground">Selecciona el plan contratado por este cliente.</p>
            </div>

            <div className="space-y-3">
              {PLANS.map((p) => {
                const isActive = planModal.currentPlan === p.key
                const IconComponent = p.icon
                return (
                  <button
                    key={p.key}
                    disabled={assigningPlan}
                    onClick={() => handleAssignPlan(p.key)}
                    className={`w-full text-left flex items-start gap-4 p-4 rounded-2xl border transition-all duration-200 hover:scale-[1.01] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                      isActive
                        ? `${p.color} ${p.ring} ring-2 border-transparent shadow-sm`
                        : `bg-slate-50/40 border-slate-200/60 hover:border-primary/20 hover:bg-white/80`
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl ${p.iconBg} ${p.iconColor} shrink-0`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-foreground">{p.label}</span>
                        <span className="text-xs font-bold text-primary shrink-0">{p.price}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{p.description}</p>
                    </div>
                    {isActive && (
                      <span className="shrink-0 mt-0.5 text-xs font-bold text-green-700 bg-green-100/60 px-2 py-0.5 rounded-full font-medium">Activo</span>
                    )}
                  </button>
                )
              })}

              {/* Quitar plan */}
              {planModal.currentPlan && (
                <button
                  disabled={assigningPlan}
                  onClick={() => handleAssignPlan(null)}
                  className="w-full text-center text-xs text-muted-foreground hover:text-destructive py-2 transition-colors disabled:opacity-50"
                >
                  Quitar plan asignado
                </button>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <Button variant="outline" size="sm" onClick={() => setPlanModal(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal eliminar cliente ─────────────────────────────────────────── */}
      {mounted && clientToDelete && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1E110A]/40 backdrop-blur-md animate-in fade-in duration-200 p-4">
          <div className="bg-white/80 border border-orange-100/40 shadow-2xl rounded-2xl max-w-sm w-full p-6 backdrop-blur-xl animate-in zoom-in-95 duration-200 space-y-4">
            <div className="space-y-2">
              <h3 className="text-base font-bold text-foreground">¿Eliminar a {clientToDelete.name}?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                ¿Estás seguro de que deseas eliminar a este cliente? Esta acción es irreversible y no se puede deshacer.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setClientToDelete(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" size="sm" onClick={confirmDelete}>
                Eliminar
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
