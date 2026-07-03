'use client'

import { useEffect, useState } from 'react'
import { appointmentsApi, ApiError } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { formatDate, APPOINTMENT_STATUS_ES } from '@/lib/utils'
import { Check, X, Calendar as CalendarIcon, Clock, Edit2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { format, isSameDay, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface AdminAppointment {
  id: string
  userId: string
  date: string
  startTime: string
  endTime: string
  status: string
  notes: string | null
  adminNotes: string | null
  firstName: string | null
  lastName: string | null
  email: string | null
}

const TIME_SLOTS = [
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30'
]

import { Loader } from '@/components/ui/loader'

import { useAdminDashboardStore } from '@/features/dashboard/store/dashboardStore'

export default function AdminCitasPage() {
  const { appointments: storeAppointments, isLoaded, appointmentsLoaded, reloadAppointments } = useAdminDashboardStore()
  const [appointments, setAppointments] = useState<AdminAppointment[]>([])
  const [isLoading, setIsLoading] = useState(!appointmentsLoaded)
  const [filter, setFilter] = useState('all')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  // Proposal states
  const [proposingId, setProposingId] = useState<string | null>(null)
  const [proposalDate, setProposalDate] = useState('')
  const [proposalTime, setProposalTime] = useState('10:00')
  const [proposalNotes, setProposalNotes] = useState('')
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      await reloadAppointments()
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isLoaded) {
      if (!appointmentsLoaded) {
        load()
      } else {
        setAppointments(storeAppointments)
        setIsLoading(false)
      }
    }
  }, [isLoaded, appointmentsLoaded, storeAppointments])

  const updateStatus = async (id: string, status: string, adminNotes?: string) => {
    try {
      await appointmentsApi.update(id, { status, adminNotes })
      toast({ title: `Cita ${APPOINTMENT_STATUS_ES[status]?.toLowerCase() ?? status}` })
      await load()
    } catch (err) {
      toast({ title: 'Error', description: err instanceof ApiError ? err.message : 'Error', variant: 'destructive' })
    }
  }

  const handleStartProposal = (appt: AdminAppointment) => {
    setProposingId(appt.id)
    setProposalDate(appt.date)
    setProposalTime(appt.startTime)
    setProposalNotes(appt.adminNotes ?? '')
  }

  const getEndTime = (startTime: string): string => {
    const [h, m] = startTime.split(':').map(Number)
    const d = new Date(2026, 0, 1, h, m)
    d.setMinutes(d.getMinutes() + 30)
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const submitProposal = async (id: string) => {
    if (!proposalDate || !proposalTime) {
      toast({ title: 'Fecha y hora requeridas', variant: 'destructive' })
      return
    }

    setIsSubmittingProposal(true)
    try {
      const endTime = getEndTime(proposalTime)
      await appointmentsApi.update(id, {
        status: 'pending',
        date: proposalDate,
        startTime: proposalTime,
        endTime,
        adminNotes: proposalNotes.trim() || 'Propuesta de reprogramación por el dietista.',
      })
      toast({ title: 'Propuesta enviada al cliente' })
      setProposingId(null)
      await load()
    } catch (err) {
      toast({ title: 'Error', description: err instanceof ApiError ? err.message : 'Error al enviar propuesta', variant: 'destructive' })
    } finally {
      setIsSubmittingProposal(false)
    }
  }

  // Filter combined with Date
  const filtered = appointments.filter((a) => {
    const matchesFilter = filter === 'all' || a.status === filter
    const matchesDate = selectedDate ? isSameDay(parseISO(a.date), selectedDate) : true
    return matchesFilter && matchesDate
  })

  const statusVariant = (s: string) => {
    if (s === 'confirmed') return 'success'
    if (s === 'cancelled') return 'destructive'
    if (s === 'completed') return 'secondary'
    return 'warning'
  }

  // Modifier functions for DayPicker to show dots
  const modifiers = {
    hasPending: appointments.filter(a => a.status === 'pending').map(a => parseISO(a.date)),
    hasConfirmed: appointments.filter(a => a.status === 'confirmed').map(a => parseISO(a.date)),
    hasOther: appointments.filter(a => a.status !== 'pending' && a.status !== 'confirmed').map(a => parseISO(a.date)),
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestión de Citas</h1>
        <p className="text-sm text-muted-foreground">Aprobar, rechazar o proponer nuevas horas de consulta para clientes</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left Column: Calendar */}
        <div className="xl:col-span-4 space-y-4">
          <Card className="shadow-sm border border-white/40 bg-white/45 backdrop-blur-xl">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" />
                Calendario
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col items-center">
              <style>{`
                .rdp { --rdp-cell-size: 40px; --rdp-accent-color: hsl(var(--primary)); --rdp-background-color: hsl(var(--primary)/0.1); margin: 0; }
                .rdp-day_selected { font-weight: bold; }
                .hasPending::after { content: ''; display: block; width: 6px; height: 6px; background-color: #f59e0b; border-radius: 50%; position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); }
                .hasConfirmed::after { content: ''; display: block; width: 6px; height: 6px; background-color: #10b981; border-radius: 50%; position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); }
                .rdp-day { position: relative; }
              `}</style>
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={es}
                modifiers={modifiers}
                modifiersClassNames={{
                  hasPending: 'hasPending',
                  hasConfirmed: 'hasConfirmed'
                }}
                className="bg-transparent text-foreground"
              />
              <div className="flex flex-wrap justify-center gap-4 mt-4 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Pendientes</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Confirmadas</span>
              </div>
              {selectedDate && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedDate(undefined)} className="mt-4 text-xs h-7">
                  Mostrar todos los días
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: List */}
        <div className="xl:col-span-8 space-y-4">
          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap bg-white/30 p-2 rounded-lg border border-white/30 backdrop-blur-md">
            {['all', 'pending', 'confirmed', 'cancelled', 'completed'].map((s) => (
              <Button key={s} variant={filter === s ? 'default' : 'ghost'} size="sm" onClick={() => setFilter(s)} className="text-xs font-semibold h-8">
                {s === 'all' ? 'Todas' : APPOINTMENT_STATUS_ES[s] ?? s}
              </Button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground/80">
              {selectedDate ? `Citas para ${formatDate(selectedDate.toISOString())}` : 'Todas las fechas'}
              <span className="ml-2 text-muted-foreground font-normal">({filtered.length})</span>
            </h3>
          </div>

          {/* Grid List */}
          {isLoading ? (
            <Loader label="Cargando citas..." />
          ) : filtered.length === 0 ? (
            <Card className="border border-dashed border-white/40 bg-white/30 backdrop-blur-xl">
              <CardContent className="text-center py-12 text-muted-foreground text-xs font-semibold">
                No se encontraron citas {selectedDate && 'para esta fecha'}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 animate-in fade-in duration-300">
              {filtered.map((appt) => {
                const clientName = [appt.firstName, appt.lastName].filter(Boolean).join(' ') || appt.email || 'Cliente'
                const isProposing = proposingId === appt.id

                return (
                  <Card key={appt.id} className="shadow-sm border border-white/40 bg-white/45 backdrop-blur-xl hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between flex-wrap gap-4">
                        {/* General details */}
                        <div className="space-y-1.5 min-w-[200px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-foreground">{clientName}</span>
                            <Badge variant={statusVariant(appt.status) as 'success' | 'warning' | 'destructive' | 'secondary' | 'default'} className="text-[10px] font-bold py-0 px-2">
                              {APPOINTMENT_STATUS_ES[appt.status] ?? appt.status}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground font-semibold">
                            <span className="flex items-center gap-1.5">
                              <CalendarIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                              {formatDate(appt.date)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              {appt.startTime} — {appt.endTime}
                            </span>
                          </div>
                          
                          {appt.notes && (
                            <p className="text-xs text-muted-foreground leading-relaxed italic bg-muted/20 p-2.5 border border-muted/50 rounded-lg mt-2">
                              Motivo: {appt.notes}
                            </p>
                          )}
                          
                          {appt.adminNotes && !isProposing && (
                            <p className="text-xs text-primary leading-relaxed bg-primary/5 p-2.5 border border-primary/20 rounded-lg font-medium mt-2">
                              Tu nota/propuesta: {appt.adminNotes}
                            </p>
                          )}
                        </div>

                        {/* Quick status actions */}
                        {!isProposing && (
                          <div className="flex gap-2 shrink-0 flex-wrap">
                            {appt.status === 'pending' && (
                              <>
                                <Button size="sm" variant="outline" className="text-green-600 border-green-600/30 hover:border-green-600 hover:bg-green-50 text-xs font-semibold gap-1 px-3"
                                  onClick={() => updateStatus(appt.id, 'confirmed')}>
                                  <Check className="h-3.5 w-3.5" /> Aprobar
                                </Button>
                                
                                <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:border-destructive hover:bg-red-50 text-xs font-semibold gap-1 px-3"
                                  onClick={() => updateStatus(appt.id, 'cancelled')}>
                                  <X className="h-3.5 w-3.5" /> Rechazar
                                </Button>

                                <Button size="sm" onClick={() => handleStartProposal(appt)} className="text-xs font-semibold gap-1 px-3 shadow-sm">
                                  <Edit2 className="h-3.5 w-3.5" /> Proponer
                                </Button>
                              </>
                            )}
                            {appt.status === 'confirmed' && (
                              <>
                                <Button size="sm" variant="outline" className="text-xs font-semibold gap-1 px-3"
                                  onClick={() => updateStatus(appt.id, 'completed')}>
                                  <Check className="h-3.5 w-3.5" /> Completada
                                </Button>
                                
                                <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:border-destructive hover:bg-red-50 text-xs font-semibold gap-1 px-3"
                                  onClick={() => updateStatus(appt.id, 'cancelled')}>
                                  <X className="h-3.5 w-3.5" /> Cancelar
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Propose new time Editor */}
                      {isProposing && (
                        <div className="p-4 rounded-xl border border-primary/20 bg-primary/[0.02] space-y-4 animate-in fade-in duration-200 mt-2">
                          <p className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                            <AlertCircle className="w-4 h-4" />
                            Proponer Cambio de Horario
                          </p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="proposal-date" className="text-xs font-bold">Nueva Fecha</Label>
                              <Input
                                id="proposal-date"
                                type="date"
                                value={proposalDate}
                                onChange={(e) => setProposalDate(e.target.value)}
                                className="text-xs bg-background"
                              />
                            </div>
                            
                            <div className="space-y-1.5">
                              <Label htmlFor="proposal-time" className="text-xs font-bold">Nueva Hora (Inicio)</Label>
                              <select
                                id="proposal-time"
                                value={proposalTime}
                                onChange={(e) => setProposalTime(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                              >
                                {TIME_SLOTS.map((t) => (
                                  <option key={t} value={t}>{t} (duración 30 min)</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="proposal-notes" className="text-xs font-bold">Nota explicativa para el cliente</Label>
                            <Textarea
                              id="proposal-notes"
                              rows={3}
                              placeholder="Introduce el motivo del cambio..."
                              value={proposalNotes}
                              onChange={(e) => setProposalNotes(e.target.value)}
                              className="text-xs bg-background leading-relaxed"
                            />
                          </div>

                          <div className="flex gap-2 justify-end pt-2 border-t border-primary/10">
                            <Button type="button" variant="outline" size="sm" onClick={() => setProposingId(null)}>
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={isSubmittingProposal}
                              onClick={() => submitProposal(appt.id)}
                              className="font-bold shadow-sm"
                            >
                              {isSubmittingProposal ? 'Enviando...' : 'Enviar Propuesta'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
