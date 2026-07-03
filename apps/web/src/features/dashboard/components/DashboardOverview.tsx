'use client'

import { useClientDashboardStore } from '@/features/dashboard/store/dashboardStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Utensils, Dumbbell, Calendar, ArrowRight, Clock, ChevronRight, Target, CheckCircle2, Flame, Smile, Zap, Star } from 'lucide-react'
import Link from 'next/link'
import { formatDate, APPOINTMENT_STATUS_ES, getDietAverageCalories, cn } from '@/lib/utils'
import { useMemo, useState } from 'react'
import { checkinsApi } from '@/lib/api'
import { toast } from '@/hooks/use-toast'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getISOWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const year = d.getUTCFullYear()
  const week = Math.ceil((((d.getTime() - Date.UTC(year, 0, 1)) / 86400000) + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

function calcPhase(weeksSinceStart: number): { label: string; color: string; bgColor: string; borderColor: string; description: string } {
  if (weeksSinceStart === 0) return { label: 'Nuevo', color: 'text-slate-600', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-200/40', description: 'Iniciando el programa' }
  if (weeksSinceStart <= 4) return { label: 'Adaptación', color: 'text-blue-600', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-200/40', description: 'Semanas 1-4: Adaptación al plan' }
  if (weeksSinceStart <= 8) return { label: 'Progresión', color: 'text-amber-600', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-200/40', description: 'Semanas 5-8: Intensificando resultados' }
  return { label: 'Mantenimiento', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-200/40', description: 'Semanas 9-12: Consolidando cambios' }
}

// ── Subcomponent: PlanPhaseWidget ─────────────────────────────────────────────

function PlanPhaseWidget({ allDiets }: { allDiets: any[] }) {
  const sortedDiets = [...allDiets].sort((a, b) => a.assignedAt.localeCompare(b.assignedAt))
  const firstDietDate = sortedDiets[0]?.assignedAt ? new Date(sortedDiets[0].assignedAt) : null
  
  const weeksSinceStart = firstDietDate
    ? Math.floor((Date.now() - firstDietDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
    : 0

  const CYCLE_WEEKS = 12
  const progressPct = Math.min(100, (weeksSinceStart / CYCLE_WEEKS) * 100)
  const phase = calcPhase(weeksSinceStart)
  const daysUntilNextReview = firstDietDate
    ? Math.max(0, 28 - ((Date.now() - firstDietDate.getTime()) / (24 * 60 * 60 * 1000)) % 28)
    : null

  if (allDiets.length === 0) return null

  return (
    <div className={`${phase.bgColor} backdrop-blur-xl border ${phase.borderColor} shadow-xl rounded-[2rem] p-6 animate-in fade-in slide-in-from-bottom-6 duration-500 ease-out fill-mode-both`}>
      <div className="flex items-center justify-between pb-4">
        <span className="text-xs font-bold uppercase tracking-wider opacity-70">Tu Plan — Progreso</span>
        <div className={`p-2.5 rounded-full bg-white/40 ${phase.color}`}>
          <Target className="h-5 w-5" />
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Phase badge + weeks */}
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black border ${phase.color} bg-white/50 border-current/20`}>
            Fase {phase.label}
          </span>
          <span className="text-sm font-bold opacity-70">Semana {weeksSinceStart} de {CYCLE_WEEKS}</span>
        </div>

        {/* Progress bar */}
        <div>
          <div className="w-full h-2.5 bg-black/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                weeksSinceStart <= 4 ? 'bg-blue-500' : weeksSinceStart <= 8 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[10px] font-semibold opacity-60 mt-1">{phase.description}</p>
        </div>

        {/* Next review */}
        {daysUntilNextReview !== null && (
          <p className="text-xs font-bold opacity-70 flex items-center gap-1.5">
            <img 
              src="/Logo/calendar-svgrepo-com.svg" 
              className="w-4 h-4 inline-block" 
              alt="Calendario" 
            />
            <span>
              Próxima revisión esperada en <span className="font-black opacity-100">{Math.round(daysUntilNextReview)} días</span>
            </span>
          </p>
        )}
      </div>
    </div>
  )
}

// ── Subcomponent: WeeklyCheckinWidget ─────────────────────────────────────────

function WeeklyCheckinWidget() {
  const { weeklyCheckins } = useClientDashboardStore()
  const currentWeek = useMemo(() => getISOWeekLabel(new Date()), [])

  const thisWeekCheckin = weeklyCheckins.find(c => c.weekLabel === currentWeek)

  if (thisWeekCheckin) {
    return (
      <div className="bg-teal-500/10 backdrop-blur-xl border border-teal-200/30 shadow-xl rounded-[2rem] p-6 animate-in fade-in slide-in-from-bottom-6 duration-500 ease-out fill-mode-both delay-100">
        <div className="flex items-center justify-between pb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-950/70">Check-in Semanal</span>
          <div className="p-2.5 rounded-full bg-teal-600/10 text-teal-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-lg font-black text-teal-950">¡Check-in completado!</p>
          <p className="text-xs text-teal-900/60 font-semibold">Semana {currentWeek}</p>
          <div className="flex gap-3 mt-2 text-xs font-bold text-teal-800/70">
            <span>Adherencia: {thisWeekCheckin.dietAdherence}/5</span>
            <span>Energía: {thisWeekCheckin.energyLevel}/5</span>
          </div>
          <p className="text-[11px] text-teal-900/50 mt-1">El próximo check-in estará disponible la semana que viene.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-teal-500/10 backdrop-blur-xl border border-teal-200/30 shadow-xl rounded-[2rem] p-6 flex flex-col justify-between hover:scale-[1.01] hover:bg-teal-500/15 transition-all duration-300 animate-in fade-in slide-in-from-bottom-6 duration-500 ease-out fill-mode-both delay-100">
      <div className="flex items-center justify-between pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-950/70">Check-in Semanal</span>
          <p className="text-[11px] text-teal-900/50 font-semibold mt-0.5">Informe de seguimiento obligatorio</p>
        </div>
        <div className="p-2.5 rounded-full bg-teal-600/10 text-teal-600">
          <Smile className="h-5 w-5" />
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-teal-950/80 leading-relaxed font-semibold">
          Por favor, completa tu check-in de esta semana. Tu dietista necesita este feedback para evaluar tu adherencia, energía, digestiones y evolución física, y así poder generar tu próxima dieta con máxima precisión.
        </p>
        <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-1.5 font-bold shadow shadow-teal-900/10 w-fit">
          <Link href="/dashboard/checkin">
            Completar Check-in Semanal <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function DashboardOverview() {
  const { activeDiet, allDiets, activeWorkout, appointments, weeklyCheckins } = useClientDashboardStore()

  const nextAppointment = appointments.find(
    (a) => a.status !== 'cancelled' && a.date >= new Date().toISOString().slice(0, 10)
  ) ?? null

  const avgCalories = activeDiet ? getDietAverageCalories(activeDiet.content, activeDiet.totalCalories) : 0

  // Show check-in widget if user has at least one diet (is in a plan)
  const showCheckin = allDiets.length > 0
  const showPhaseWidget = allDiets.length > 0

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Grid widgets */}
      <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto w-full">

        {/* Phase Progress Widget */}
        {showPhaseWidget && <PlanPhaseWidget allDiets={allDiets} />}

        {/* Weekly Check-in Widget */}
        {showCheckin && <WeeklyCheckinWidget />}
        
        {/* Next Appointment */}
        <div className="bg-orange-500/10 backdrop-blur-xl border border-orange-200/30 shadow-xl shadow-orange-950/[0.01] hover:shadow-orange-950/[0.03] hover:scale-[1.01] hover:bg-orange-500/15 transition-all duration-300 rounded-[2rem] p-6 flex flex-col justify-between animate-in fade-in slide-in-from-bottom-6 duration-500 ease-out fill-mode-both delay-150">
          <div className="flex items-center justify-between pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-950/70">Próxima Cita</span>
            <div className="p-2.5 rounded-full bg-orange-500/10 text-orange-600">
              <img src="/Logo/calendar-svgrepo-com.svg" className="h-5 w-5" alt="Calendario" />
            </div>
          </div>
          <div className="pt-2">
            {nextAppointment ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-orange-950">{formatDate(nextAppointment.date)}</div>
                  <div className="flex items-center gap-2 text-sm text-orange-900/60 font-semibold">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span>{nextAppointment.startTime} — {nextAppointment.endTime}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Badge variant={nextAppointment.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs font-semibold px-3 py-1 bg-white text-orange-900 border border-orange-100 hover:bg-orange-50">
                    {APPOINTMENT_STATUS_ES[nextAppointment.status]}
                  </Badge>
                  <Link href="/dashboard/citas" className="text-xs text-orange-700 font-bold hover:text-orange-950 flex items-center gap-0.5">
                    Gestionar <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-orange-900/70 leading-relaxed font-semibold">No tienes ninguna cita programada.</p>
                <Button asChild size="sm" variant="outline" className="border-orange-500/30 bg-orange-500/20 hover:bg-orange-500/30 hover:border-orange-500/40 text-orange-950 hover:text-orange-950 backdrop-blur-md shadow-sm transition-all duration-300">
                  <Link href="/dashboard/citas" className="gap-1.5 font-bold">
                    Solicitar Cita <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Active Diet */}
        <div className="bg-green-500/10 backdrop-blur-xl border border-green-200/30 shadow-xl shadow-green-950/[0.01] hover:shadow-green-950/[0.03] hover:scale-[1.01] hover:bg-green-500/15 transition-all duration-300 rounded-[2rem] p-6 flex flex-col justify-between animate-in fade-in slide-in-from-bottom-6 duration-500 ease-out fill-mode-both delay-200">
          <div className="flex items-center justify-between pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-green-950/70">Dieta Activa</span>
            <div className="p-2.5 rounded-full bg-green-600/10 text-green-600">
              <Utensils className="h-5 w-5" />
            </div>
          </div>
          <div className="pt-2">
            {activeDiet ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-green-950 truncate">{activeDiet.title}</div>
                  {avgCalories > 0 && (
                    <p className="text-sm text-green-900/60 font-semibold">{avgCalories} kcal/día</p>
                  )}
                </div>
                <div className="flex justify-start pt-2">
                  <Button asChild size="sm" variant="outline" className="border-green-500/30 bg-green-500/20 hover:bg-green-500/30 hover:border-green-500/40 text-green-950 hover:text-green-950 backdrop-blur-md shadow-sm transition-all duration-300">
                    <Link href="/dashboard/dietas" className="gap-1.5 font-bold">
                      Ver Dieta <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-green-900/70 leading-relaxed font-semibold">Sin dieta asignada todavía.</p>
                <div className="h-[38px] flex items-center">
                  <span className="text-xs text-green-900/50 italic font-medium">Tu nutricionista la preparará pronto</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active Workout */}
        <div className="bg-purple-500/10 backdrop-blur-xl border border-purple-200/30 shadow-xl shadow-purple-950/[0.01] hover:shadow-purple-950/[0.03] hover:scale-[1.01] hover:bg-purple-500/15 transition-all duration-300 rounded-[2rem] p-6 flex flex-col justify-between animate-in fade-in slide-in-from-bottom-6 duration-500 ease-out fill-mode-both delay-300">
          <div className="flex items-center justify-between pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-950/70">Rutina Deportiva</span>
            <div className="p-2.5 rounded-full bg-purple-600/10 text-purple-600">
              <Dumbbell className="h-5 w-5" />
            </div>
          </div>
          <div className="pt-2">
            {activeWorkout ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-purple-950 truncate">{activeWorkout.title}</div>
                  <p className="text-sm text-purple-900/60 font-semibold">
                    {activeWorkout.daysPerWeek ?? '?'} días/semana
                    {activeWorkout.duration && ` · ${activeWorkout.duration} min`}
                  </p>
                </div>
                <div className="flex justify-start pt-2">
                  <Button asChild size="sm" variant="outline" className="border-purple-500/30 bg-purple-500/20 hover:bg-purple-500/30 hover:border-purple-500/40 text-purple-950 hover:text-purple-950 backdrop-blur-md shadow-sm transition-all duration-300">
                    <Link href="/dashboard/rutinas" className="gap-1.5 font-bold">
                      Ver Rutina <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-purple-900/70 leading-relaxed font-semibold">Sin rutina asignada todavía.</p>
                <div className="h-[38px] flex items-center">
                  <span className="text-xs text-purple-900/50 italic font-medium">Tu entrenador la preparará pronto</span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
