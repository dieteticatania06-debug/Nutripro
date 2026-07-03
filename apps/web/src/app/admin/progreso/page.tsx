'use client'

import { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useAdminDashboardStore } from '@/features/dashboard/store/dashboardStore'
import { progressApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader } from '@/components/ui/loader'
import { toast } from '@/hooks/use-toast'
import { formatDate, getAvatarUrl } from '@/lib/utils'
import Image from 'next/image'
import type { ProgressRecord } from '@nutripro/shared'
import {
  Scale,
  Trash2,
  Calendar,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Search,
  ChevronDown,
  ChevronUp,
  Activity,
  Crown,
  Shield
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

interface ClientOption {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role?: string
  plan: 'basico' | 'pro' | 'elite' | null
  avatarUrl?: string | null
}

const planBadgeProps: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' }> = {
  basico: { label: 'Básico', variant: 'default' },
  pro: { label: 'Pro', variant: 'warning' },
  elite: { label: 'Élite', variant: 'success' },
}

export default function AdminProgresoPage() {
  const { clients: storeClients, isLoaded, clientsLoaded, reloadClients } = useAdminDashboardStore()
  const [clients, setClients] = useState<ClientOption[]>([])
  const [isLoading, setIsLoading] = useState(!clientsLoaded)
  const [search, setSearch] = useState('')
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null)
  
  // Progress records cache indexed by client ID
  const [clientProgress, setClientProgress] = useState<Record<string, ProgressRecord[]>>({})
  const [loadingClientsProgress, setLoadingClientsProgress] = useState<Record<string, boolean>>({})
  
  // Delete record flow
  const [recordToDelete, setRecordToDelete] = useState<{ id: string; clientId: string } | null>(null)
  const [mounted, setMounted] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      await reloadClients()
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

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

  useEffect(() => {
    if (recordToDelete) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [recordToDelete])

  // Filter clients list
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.toLowerCase()
      const email = c.email.toLowerCase()
      const query = search.toLowerCase()
      return name.includes(query) || email.includes(query)
    })
  }, [clients, search])

  // Load progress for a client on expand
  const handleToggleExpand = async (clientId: string) => {
    if (expandedClientId === clientId) {
      setExpandedClientId(null)
      return
    }

    setExpandedClientId(clientId)

    // Load if not in cache yet
    if (!clientProgress[clientId]) {
      setLoadingClientsProgress((prev) => ({ ...prev, [clientId]: true }))
      try {
        const records = await progressApi.list(clientId)
        setClientProgress((prev) => ({ ...prev, [clientId]: records }))
      } catch (err: any) {
        toast({
          title: 'Error al cargar progreso',
          description: err.message || 'No se pudieron recuperar los registros de peso.',
          variant: 'destructive',
        })
      } finally {
        setLoadingClientsProgress((prev) => ({ ...prev, [clientId]: false }))
      }
    }
  }

  const handleDeleteClick = (id: string, clientId: string) => {
    setRecordToDelete({ id, clientId })
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return
    const { id, clientId } = recordToDelete

    try {
      await progressApi.delete(id)
      
      // Update cache
      setClientProgress((prev) => {
        const currentRecords = prev[clientId] ?? []
        return {
          ...prev,
          [clientId]: currentRecords.filter((r) => r.id !== id),
        }
      })

      toast({
        title: 'Registro eliminado',
        description: 'El registro de peso ha sido eliminado con éxito.',
      })
    } catch (err: any) {
      toast({
        title: 'Error al eliminar',
        description: err.message || 'No se pudo eliminar el registro.',
        variant: 'destructive',
      })
    } finally {
      setRecordToDelete(null)
    }
  }

  // Compute stats for a client's records
  const getClientStats = (records: ProgressRecord[]) => {
    if (!records || records.length === 0) return null

    const sorted = [...records].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    const start = sorted[0]?.weight ?? 0
    const current = sorted[sorted.length - 1]?.weight ?? 0
    const diff = current - start

    const weights = records.map((r) => r.weight).filter((w): w is number => w !== null)
    const min = weights.length > 0 ? Math.min(...weights) : 0
    const max = weights.length > 0 ? Math.max(...weights) : 0

    return { start, current, diff, min, max }
  }

  // Compute chart data for Recharts
  const getChartData = (records: ProgressRecord[]) => {
    if (!records) return []
    return [...records]
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
      .map((r) => {
        const date = new Date(r.recordedAt)
        const day = date.getDate()
        const month = date.toLocaleDateString('es-ES', { month: 'short' })
        return {
          fecha: `${day} ${month}`,
          fechaCompleta: r.recordedAt,
          Peso: r.weight,
        }
      })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Seguimiento de Progreso</h1>
          <p className="text-muted-foreground">Monitorea la evolución de peso y estado físico de tus clientes</p>
        </div>
      </div>

      {/* Search client */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <Loader label="Cargando clientes..." />
      ) : filteredClients.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            No se encontraron clientes
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredClients.map((client) => {
            const isExpanded = expandedClientId === client.id
            const clientName = `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() || client.email
            const records = clientProgress[client.id] ?? []
            const isProgressLoading = loadingClientsProgress[client.id]
            const stats = getClientStats(records)
            const chartData = getChartData(records)

            return (
              <Card key={client.id} className="overflow-hidden border border-white/40 bg-white/45 backdrop-blur-xl shadow-sm">
                <CardHeader
                  className="p-4 bg-white/30 cursor-pointer hover:bg-white/50 transition-colors flex flex-row items-center justify-between space-y-0"
                  onClick={() => handleToggleExpand(client.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20 shrink-0">
                      <Image
                        src={getAvatarUrl(client.avatarUrl, client.email)}
                        alt="Avatar"
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{clientName}</CardTitle>
                      <p className="text-xs text-muted-foreground">{client.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    {client.plan ? (
                      <Badge variant={planBadgeProps[client.plan]?.variant ?? 'default'} className="flex items-center gap-1 capitalize py-0.5 px-2 rounded-full font-medium text-[10px]">
                        {client.plan === 'elite' && <Crown className="h-3 w-3 text-amber-500" />}
                        {client.plan === 'pro' && <Activity className="h-3 w-3 text-orange-500" />}
                        {client.plan === 'basico' && <Shield className="h-3 w-3 text-emerald-500" />}
                        {planBadgeProps[client.plan]?.label}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] py-0.5 px-2">Sin plan</Badge>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleToggleExpand(client.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="p-4 border-t bg-transparent space-y-6">
                    {isProgressLoading ? (
                      <Loader label="Cargando datos de progreso..." />
                    ) : records.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Este cliente aún no ha registrado ningún progreso de peso.</p>
                    ) : (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Summary Stats */}
                        {stats && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="border border-white/60 bg-white/45 backdrop-blur-xl shadow-sm">
                              <CardContent className="p-4 flex items-center justify-between">
                                <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Peso Inicial</p>
                                  <p className="text-lg font-black text-[#2D1E1B]">{stats.start} kg</p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                  <Scale className="w-4 h-4" />
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="border border-white/60 bg-white/45 backdrop-blur-xl shadow-sm">
                              <CardContent className="p-4 flex items-center justify-between">
                                <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Peso Actual</p>
                                  <p className="text-lg font-black text-[#2D1E1B]">{stats.current} kg</p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                  <Scale className="w-4 h-4" />
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="border border-white/60 bg-white/45 backdrop-blur-xl shadow-sm">
                              <CardContent className="p-4 flex items-center justify-between">
                                <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Diferencia Total</p>
                                  <p className={`text-lg font-black ${stats.diff < 0 ? 'text-emerald-600' : stats.diff > 0 ? 'text-amber-600' : 'text-[#2D1E1B]'}`}>
                                    {stats.diff > 0 ? `+${stats.diff.toFixed(1)}` : stats.diff.toFixed(1)} kg
                                  </p>
                                </div>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stats.diff < 0 ? 'bg-emerald-100 text-emerald-600' : stats.diff > 0 ? 'bg-amber-100 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
                                  {stats.diff < 0 ? (
                                    <ArrowDownRight className="w-4 h-4" />
                                  ) : stats.diff > 0 ? (
                                    <ArrowUpRight className="w-4 h-4" />
                                  ) : (
                                    <TrendingDown className="w-4 h-4" />
                                  )}
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="border border-white/60 bg-white/45 backdrop-blur-xl shadow-sm">
                              <CardContent className="p-4 flex items-center justify-between">
                                <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mínimo / Máximo</p>
                                  <p className="text-sm font-black text-[#2D1E1B]">{stats.min} kg / {stats.max} kg</p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                  <Award className="w-4 h-4" />
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Weight Trend Chart */}
                          <Card className="lg:col-span-2 border border-white/40 bg-white/45 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
                            <CardHeader className="pb-2 p-4">
                              <CardTitle className="text-sm font-bold text-[#2D1E1B]">Evolución del Peso</CardTitle>
                              <CardDescription className="text-[11px]">Gráfico histórico de la tendencia de peso</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 flex-grow flex items-center justify-center min-h-[260px]">
                              {chartData.length > 0 ? (
                                <div className="w-full h-[240px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                                      <XAxis
                                        dataKey="fecha"
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fontSize: 9, fill: 'rgba(45,30,27,0.6)', fontWeight: 600 }}
                                      />
                                      <YAxis
                                        domain={['auto', 'auto']}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fontSize: 9, fill: 'rgba(45,30,27,0.6)', fontWeight: 600 }}
                                      />
                                      <Tooltip
                                        contentStyle={{
                                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                          border: '1px solid rgba(0,0,0,0.1)',
                                          borderRadius: '8px',
                                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                          fontSize: '11px'
                                        }}
                                      />
                                      <Line
                                        type="monotone"
                                        dataKey="Peso"
                                        stroke="#2C5E43"
                                        strokeWidth={2}
                                        dot={{ r: 3, stroke: '#2C5E43', strokeWidth: 1.5, fill: '#fff' }}
                                        activeDot={{ r: 5, fill: '#2C5E43' }}
                                      />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              ) : (
                                <div className="text-center text-muted-foreground p-4">
                                  <p className="text-xs">No hay suficientes datos</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          {/* Historical records list */}
                          <Card className="border border-white/40 bg-white/45 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
                            <CardHeader className="pb-2 p-4">
                              <CardTitle className="text-sm font-bold text-[#2D1E1B]">Logs de Peso</CardTitle>
                              <CardDescription className="text-[11px]">Listado de todos los pesos guardados</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 flex-grow overflow-y-auto max-h-[260px]">
                              <table className="w-full text-left border-collapse text-[11px]">
                                <thead>
                                  <tr className="bg-primary/5 text-muted-foreground font-bold border-b border-white/20">
                                    <th className="p-3">Fecha</th>
                                    <th className="p-3">Peso</th>
                                    <th className="p-3">Notas</th>
                                    <th className="p-3 text-right">Acción</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/20">
                                  {records.map((record) => (
                                    <tr key={record.id} className="hover:bg-white/10 transition-colors">
                                      <td className="p-3 font-semibold text-[#2D1E1B]/80">{formatDate(record.recordedAt)}</td>
                                      <td className="p-3 font-bold text-[#2D1E1B]">{record.weight} kg</td>
                                      <td className="p-3 text-muted-foreground max-w-[80px] truncate font-medium" title={record.notes || ''}>
                                        {record.notes || '—'}
                                      </td>
                                      <td className="p-3 text-right">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleDeleteClick(record.id, client.id)}
                                          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Translucent Deletion Modal */}
      {mounted && recordToDelete && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1E110A]/40 backdrop-blur-md animate-in fade-in duration-200 p-4">
          <div className="bg-white/80 border border-orange-100/40 shadow-2xl rounded-2xl max-w-sm w-full p-6 backdrop-blur-xl animate-in zoom-in-95 duration-200 space-y-4">
            <div className="space-y-2">
              <h3 className="text-base font-bold text-foreground">¿Eliminar este registro?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                ¿Estás seguro de que deseas eliminar este registro de peso? Esta acción es irreversible y afectará las estadísticas e historial de progreso del cliente.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRecordToDelete(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={confirmDelete}
              >
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
