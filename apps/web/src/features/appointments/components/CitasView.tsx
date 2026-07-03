'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { appointmentsApi, ApiError } from '@/lib/api'
import type { Appointment, AppointmentSlot } from '@nutripro/shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { formatDate, APPOINTMENT_STATUS_ES } from '@/lib/utils'
import { Plus, X, Clock, CheckCircle2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

import { Loader } from '@/components/ui/loader'

import { useClientDashboardStore } from '@/features/dashboard/store/dashboardStore'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function CitasView() {
  const { appointments: storeAppointments, isLoaded, reloadAppointments } = useClientDashboardStore()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(!isLoaded)
  const [showNewForm, setShowNewForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<AppointmentSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null)
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Calendar states (only current month and next month allowed)
  const todayDate = new Date()
  const todayStr = todayDate.toISOString().slice(0, 10)
  const [currentMonth, setCurrentMonth] = useState(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1))

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
      setAppointments(storeAppointments)
      setIsLoading(false)
    }
  }, [isLoaded, storeAppointments])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (appointmentToCancel) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [appointmentToCancel])

  const loadSlots = async (date: string) => {
    setSlotsLoading(true)
    setSelectedSlot(null)
    try {
      const data = await appointmentsApi.getAvailable(date)
      setSlots(data as AppointmentSlot[])
    } finally {
      setSlotsLoading(false)
    }
  }

  useEffect(() => {
    if (showNewForm && selectedDate) loadSlots(selectedDate)
  }, [selectedDate, showNewForm])

  const handleBook = async () => {
    if (!selectedSlot || !selectedDate) return
    try {
      await appointmentsApi.create({
        date: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      })
      toast({ title: 'Cita solicitada', description: 'Tu dietista revisará y confirmará tu cita pronto.' })
      setShowNewForm(false)
      setSelectedDate('')
      setSelectedSlot(null)
      await load()
    } catch (err) {
      toast({ title: 'Error', description: err instanceof ApiError ? err.message : 'Error al solicitar la cita', variant: 'destructive' })
    }
  }

  const handleCancel = (id: string) => {
    setAppointmentToCancel(id)
  }

  const confirmCancel = async () => {
    if (!appointmentToCancel) return
    try {
      await appointmentsApi.cancel(appointmentToCancel)
      toast({ title: 'Cita cancelada' })
      await load()
    } catch {
      toast({ title: 'Error al cancelar', variant: 'destructive' })
    } finally {
      setAppointmentToCancel(null)
    }
  }

  const statusVariant = (s: string) => {
    if (s === 'confirmed') return 'success'
    if (s === 'cancelled') return 'destructive'
    if (s === 'completed') return 'secondary'
    return 'warning'
  }

  // Calendar builders
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const firstDayIndex = (firstDayOfMonth.getDay() + 6) % 7 // Monday: 0 to Sunday: 6
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const calendarCells: (Date | null)[] = []
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(new Date(year, month, d))
  }

  // Boundary checks (Current month and next month only)
  const startOfCurrentMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
  const startOfNextMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 1)

  const canGoPrev = currentMonth.getTime() > startOfCurrentMonth.getTime()
  const canGoNext = currentMonth.getTime() < startOfNextMonth.getTime()

  const prevMonth = () => {
    if (canGoPrev) {
      setCurrentMonth(new Date(year, month - 1, 1))
    }
  }

  const nextMonth = () => {
    if (canGoNext) {
      setCurrentMonth(new Date(year, month + 1, 1))
    }
  }

  // Appointments lookup
  const appointmentsByDate = appointments.reduce((acc, appt) => {
    if (appt.status !== 'cancelled') {
      acc[appt.date] = appt
    }
    return acc
  }, {} as Record<string, Appointment>)

  return (
    <div className="space-y-6">
      
      {/* Action Header */}
      <div className="flex justify-between items-center gap-4 border-b pb-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-muted-foreground/60 rounded-full" />
          Agenda y Reservas
        </h2>
        <Button onClick={() => { setShowNewForm(!showNewForm); setSelectedDate('') }} size="sm" className="shadow-sm">
          {showNewForm ? (
            <>
              <X className="h-4 w-4 mr-2" /> Cerrar Calendario
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" /> Reservar Cita
            </>
          )}
        </Button>
      </div>

      {/* Interactive Booking Calendar Form */}
      {showNewForm && (
        <Card className="shadow-md bg-white/45 backdrop-blur-xl border border-white/40 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <CardHeader className="pb-4 border-b border-white/20 bg-white/10 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <img src="/Logo/calendar-svgrepo-com.svg" className="w-4 h-4" alt="Calendario" />
                Reserva de Cita Online
              </CardTitle>
              <CardDescription className="text-xs">Elige un día y una hora disponible para agendar tu cita.</CardDescription>
            </div>
            {/* Nav Arrows */}
            <div className="flex items-center gap-1 border border-white/20 rounded-lg p-1 bg-background/50 backdrop-blur-sm select-none shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-background/80" onClick={prevMonth} disabled={!canGoPrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-bold px-2 capitalize text-foreground min-w-[95px] text-center">
                {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-background/80" onClick={nextMonth} disabled={!canGoNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-muted-foreground/10">
              
              {/* Columna Izquierda: Calendario */}
              <div className="p-5 md:col-span-7 lg:col-span-6 flex flex-col justify-center">
                <div className="w-full max-w-sm mx-auto">
                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {WEEKDAYS.map((w) => (
                      <span key={w} className="text-[10px] font-bold text-muted-foreground uppercase py-1">{w}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calendarCells.map((day, idx) => {
                      if (!day) return <div key={`empty-${idx}`} className="aspect-square" />
                      
                      const dateStr = day.toISOString().slice(0, 10)
                      const dayOfWeek = day.getDay()
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
                      const isPast = dateStr < todayStr
                      const isToday = dateStr === todayStr
                      const isSelected = selectedDate === dateStr
                      const hasAppt = !!appointmentsByDate[dateStr]

                      const isDisabled = isWeekend || isPast

                      return (
                        <button
                          key={dateStr}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => setSelectedDate(dateStr)}
                          className={cn(
                            "aspect-square rounded-lg flex flex-col items-center justify-center relative text-xs font-semibold transition-all border",
                            isDisabled 
                              ? "bg-muted/10 border-transparent text-muted-foreground/35 cursor-not-allowed" 
                              : isSelected 
                                ? "bg-primary border-primary text-primary-foreground shadow-sm font-extrabold" 
                                : "bg-card border-muted/50 text-foreground hover:border-primary/50 hover:bg-primary/[0.02]",
                            isToday && !isSelected && "border-primary/45 font-bold text-primary bg-primary/5"
                          )}
                        >
                          <span>{day.getDate()}</span>
                          
                          {/* Appointment dot indicator */}
                          {hasAppt && (
                            <span className={cn(
                              "absolute bottom-1 w-1.5 h-1.5 rounded-full",
                              isSelected ? "bg-primary-foreground" : "bg-primary"
                            )} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Selección de Hora */}
              <div className="p-5 md:col-span-5 lg:col-span-6 flex flex-col justify-between min-h-[320px] bg-muted/[0.01]">
                <div className="space-y-4">
                  {selectedDate ? (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Día seleccionado</span>
                        <p className="text-xs font-extrabold text-foreground capitalize flex items-center gap-1.5">
                          <img src="/Logo/calendar-svgrepo-com.svg" className="w-3.5 h-3.5 shrink-0" alt="Calendario" />
                          {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                        {appointmentsByDate[selectedDate] && (
                          <div className="mt-1">
                            <Badge variant="warning" className="text-[9px] font-bold py-0.5 px-2">Ya tienes una cita este día</Badge>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Horarios disponibles</span>
                        {slotsLoading ? (
                          <div className="py-6 text-center space-y-2">
                            <Loader label="Cargando horas..." className="scale-75" />
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-1.5">
                            {slots.filter((s) => s.isAvailable).map((slot) => {
                              const isSelected = selectedSlot?.startTime === slot.startTime
                              return (
                                <Button
                                  key={slot.startTime}
                                  type="button"
                                  variant={isSelected ? 'default' : 'outline'}
                                  size="sm"
                                  className={cn(
                                    "text-xs font-semibold h-9 shadow-sm transition-all border",
                                    isSelected ? "border-primary" : "hover:bg-muted/50 border-muted-foreground/15"
                                  )}
                                  onClick={() => setSelectedSlot(slot)}
                                >
                                  {slot.startTime}
                                </Button>
                              )
                            })}
                            {slots.filter((s) => s.isAvailable).length === 0 && (
                              <div className="col-span-3 flex items-center gap-2 p-3 bg-muted/30 border border-muted/50 text-muted-foreground text-xs rounded-xl w-full">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>No quedan horas disponibles pautadas.</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-12 px-4 space-y-3 h-full my-auto">
                      <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary/60 border border-primary/10">
                        <Clock className="w-5 h-5 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-foreground">Elige una fecha</p>
                        <p className="text-[11px] text-muted-foreground max-w-[200px] leading-normal mx-auto">
                          Selecciona un día en el calendario de la izquierda para ver las horas disponibles.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit footer */}
                <div className="flex gap-2 justify-end pt-4 border-t border-muted-foreground/10 mt-6">
                  <Button variant="outline" size="sm" onClick={() => { setShowNewForm(false); setSelectedDate('') }}>
                    Cerrar
                  </Button>
                  <Button 
                    onClick={handleBook} 
                    disabled={!selectedSlot || !selectedDate} 
                    size="sm" 
                    className="font-bold shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Confirmar {selectedSlot ? `a las ${selectedSlot.startTime}` : ''}
                  </Button>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      )}

      {/* Appointments List */}
      {isLoading ? (
        <Loader label="Cargando citas..." />
      ) : appointments.length === 0 ? (
        <Card className="border-dashed border-white/40 bg-white/30 backdrop-blur-xl">
          <CardContent className="text-center py-16 space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <img src="/Logo/calendar-svgrepo-com.svg" className="h-6 w-6 opacity-60" alt="Calendario" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground text-sm">No tienes ninguna cita agendada</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Agenda tu primera cita de control con tu nutricionista usando el botón superior.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 animate-in fade-in duration-300">
          {appointments.map((appt) => (
            <Card key={appt.id} className="shadow-sm border border-white/40 bg-white/45 backdrop-blur-xl overflow-hidden">
              <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
                
                {/* Visual date card */}
                <div className="flex items-center gap-4">
                  {/* Custom Calendar Icon */}
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/10">
                    <img src="/Logo/calendar-svgrepo-com.svg" className="w-7 h-7" alt="Calendario" />
                  </div>

                  {/* Cita Details */}
                  <div className="space-y-1">
                    <div className="text-sm font-extrabold text-foreground capitalize">
                      {new Date(appt.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{appt.startTime} — {appt.endTime}</span>
                      </div>
                      <Badge variant={statusVariant(appt.status) as 'success' | 'warning' | 'destructive' | 'secondary' | 'default'} className="text-[10px] font-bold px-2 py-0">
                        {APPOINTMENT_STATUS_ES[appt.status]}
                      </Badge>
                    </div>
                    {appt.adminNotes ? (
                      <p className="text-xs text-muted-foreground leading-relaxed italic bg-muted/40 p-2 rounded-lg border border-muted/30 mt-1">
                        Nota del dietista: {appt.adminNotes}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground/70">Cita de seguimiento general</p>
                    )}
                  </div>
                </div>

                {/* Cancellation button */}
                {(appt.status === 'pending' || appt.status === 'confirmed') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:border-destructive hover:bg-destructive/10 shrink-0 gap-1 text-xs font-semibold px-3"
                    onClick={() => handleCancel(appt.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancelar
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Translucent Confirmation Modal */}
      {mounted && appointmentToCancel && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1E110A]/40 backdrop-blur-md animate-in fade-in duration-200 p-4">
          <div className="bg-white/80 border border-orange-100/40 shadow-2xl rounded-2xl max-w-sm w-full p-6 backdrop-blur-xl animate-in zoom-in-95 duration-200 space-y-4">
            <div className="space-y-2">
              <h3 className="text-base font-bold text-foreground">¿Cancelar esta cita?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                ¿Estás seguro de que deseas cancelar esta cita agendada? Esta acción es irreversible y no se puede deshacer.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAppointmentToCancel(null)}
              >
                Cerrar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={confirmCancel}
              >
                Cancelar Cita
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}


