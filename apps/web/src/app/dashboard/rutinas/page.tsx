'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { workoutsApi } from '@/lib/api'
import type { Workout, WorkoutExercise } from '@nutripro/shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dumbbell, Calendar, Flame, Timer, Check, Award, Trophy, Lock, Crown, Eye } from 'lucide-react'
import { formatDate, LEVEL_ES } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/features/auth/store/authStore'
import { toast } from '@/hooks/use-toast'

import { Loader } from '@/components/ui/loader'

import { useClientDashboardStore } from '@/features/dashboard/store/dashboardStore'

type FullWorkout = Workout & { exercises: WorkoutExercise[] }

function RutinasLocked() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-2xl shadow-amber-400/30 ring-4 ring-white/20">
          <Crown className="w-10 h-10 text-white" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-[#2D1E1B] tracking-tight">
            Disponible en Plan Pro
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Las rutinas de entrenamiento personalizadas están incluidas exclusivamente en el Plan Pro. 
            Contacta con tu dietista para actualizar tu plan.
          </p>
        </div>
        <div className="bg-white/50 backdrop-blur-xl border border-amber-300/40 rounded-2xl p-5 shadow-lg space-y-3 text-left">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Plan Pro — 25€/mes</p>
          {[
            'Dieta personalizada',
            'Gestión de citas',
            'Chat con dietista',
            '✦ Rutinas de entrenamiento',
          ].map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm text-[#2D1E1B] font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              {f}
            </div>
          ))}
        </div>
        <Button
          asChild
          className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold shadow-lg shadow-amber-400/30 rounded-full transition-all duration-300 hover:-translate-y-0.5"
        >
          <a href="mailto:dieteticatania06@gmail.com?subject=Quiero%20actualizar%20a%20Plan%20Pro">
            Contactar para actualizar
          </a>
        </Button>
      </div>
    </div>
  )
}

export default function RutinasPage() {
  const { user } = useAuthStore()
  const { activeWorkout: storeActiveWorkout, allWorkouts: storeAllWorkouts, isLoaded } = useClientDashboardStore()
  const [activeWorkout, setActiveWorkout] = useState<FullWorkout | null>(null)
  const [history, setHistory] = useState<Workout[]>([])
  const [isLoading, setIsLoading] = useState(!isLoaded)
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({})
  const [selectedWorkoutForView, setSelectedWorkoutForView] = useState<FullWorkout | null>(null)
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(false)

  const handleViewWorkout = async (workout: Workout) => {
    setIsLoadingWorkout(true)
    try {
      const full = await workoutsApi.get(workout.id)
      setSelectedWorkoutForView(full as FullWorkout)
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar el detalle de la rutina.',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingWorkout(false)
    }
  }

  useEffect(() => {
    if (isLoaded) {
      setActiveWorkout(storeActiveWorkout as FullWorkout | null)
      setHistory(storeAllWorkouts.filter((w) => w.status === 'archived'))
      setIsLoading(false)
    }
  }, [isLoaded, storeActiveWorkout, storeAllWorkouts])

  const toggleComplete = (id: string) => {
    setCompletedExercises(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  if (isLoading) {
    return <Loader label="Cargando programa de entrenamiento..." />
  }

  // Guard: solo plan pro puede ver rutinas
  if (user && user.plan !== 'pro' && user.plan !== 'elite') {
    return <RutinasLocked />
  }

  const DAYS_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  const groupedExercises: Record<string, WorkoutExercise[]> = {}
  const noDayExercises: WorkoutExercise[] = []

  if (activeWorkout && activeWorkout.exercises) {
    activeWorkout.exercises.forEach((ex) => {
      if (ex.day && DAYS_ORDER.includes(ex.day)) {
        if (!groupedExercises[ex.day]) {
          groupedExercises[ex.day] = []
        }
        groupedExercises[ex.day].push(ex)
      } else {
        noDayExercises.push(ex)
      }
    })
  }
  const totalExercises = activeWorkout?.exercises.length ?? 0
  const completedCount = Object.values(completedExercises).filter(Boolean).length
  const completionPercentage = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mis Rutinas</h1>
        <p className="text-muted-foreground">Entrenamientos personalizados adaptados a tus objetivos</p>
      </div>

      {!activeWorkout ? (
        <Card className="border-dashed border-white/40 bg-white/30 backdrop-blur-xl">
          <CardContent className="text-center py-16 space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Dumbbell className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Sin rutina activa asignada</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Tu entrenador diseñará tus rutinas de fuerza y cardio muy pronto.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          
          {/* Workout Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="shadow-sm border-l-4 border-l-blue-500 bg-white/45 backdrop-blur-xl border border-white/30">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nivel de Fuerza</p>
                  <p className="text-base font-extrabold text-foreground">
                    {activeWorkout.level ? LEVEL_ES[activeWorkout.level] : 'General'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-l-4 border-l-indigo-500 bg-white/45 backdrop-blur-xl border border-white/30">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Frecuencia</p>
                  <p className="text-base font-extrabold text-foreground">
                    {activeWorkout.daysPerWeek ? `${activeWorkout.daysPerWeek} días/sem` : 'Libre'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-l-4 border-l-orange-500 bg-white/45 backdrop-blur-xl border border-white/30">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                  <Timer className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Duración Media</p>
                  <p className="text-base font-extrabold text-foreground">
                    {activeWorkout.duration ? `${activeWorkout.duration} min` : 'No pautado'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Workout Card & Exercises List */}
          <Card className="shadow-md border-white/40 overflow-hidden bg-white/45 backdrop-blur-xl">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg font-bold">{activeWorkout.title}</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  {activeWorkout.description || 'Pautas de entrenamiento y objetivos de fuerza'}
                </CardDescription>
              </div>
              {totalExercises > 0 && (
                <div className="flex items-center gap-3 shrink-0 self-start">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Progreso de la sesión</p>
                    <p className="text-xs font-semibold text-foreground">{completedCount} de {totalExercises} completados</p>
                  </div>
                  <div className="relative w-12 h-12 rounded-full border bg-background flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">{completionPercentage}%</span>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {activeWorkout.exercises.length === 0 ? (
                  <p className="text-center py-6 text-sm text-muted-foreground">Esta rutina no tiene ejercicios asignados.</p>
                ) : (
                  <>
                    {DAYS_ORDER.map((day) => {
                      const dayExs = groupedExercises[day]
                      if (!dayExs || dayExs.length === 0) return null
                      return (
                        <div key={day} className="space-y-3">
                          <h3 className="text-sm font-bold text-primary flex items-center gap-2 border-b border-primary/20 pb-1 mt-4 first:mt-0">
                            <Calendar className="w-4 h-4" />
                            {day}
                          </h3>
                          <div className="space-y-3">
                            {dayExs.sort((a, b) => a.order - b.order).map((ex) => {
                              const isCompleted = !!completedExercises[ex.id]
                              return (
                                <div 
                                  key={ex.id}
                                  onClick={() => toggleComplete(ex.id)}
                                  className={cn(
                                    "flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer select-none",
                                    isCompleted 
                                      ? "bg-black/5 border-white/20 opacity-60 text-muted-foreground" 
                                      : "bg-white/40 hover:bg-white/60 border-white/30 shadow-sm hover:shadow-md hover:-translate-y-0.5 backdrop-blur-md"
                                  )}
                                >
                                  {/* Checkbox Circle */}
                                  <div className={cn(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
                                    isCompleted 
                                      ? "border-emerald-500 bg-emerald-500 text-white" 
                                      : "border-muted-foreground/30 bg-background"
                                  )}>
                                    {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                  </div>

                                  {/* Details */}
                                  <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5">
                                      <h4 className={cn("text-sm font-bold truncate text-foreground/90", isCompleted && "line-through text-muted-foreground")}>
                                        {ex.name}
                                      </h4>
                                      {/* Badges Row */}
                                      <div className="flex gap-1.5 flex-wrap shrink-0">
                                        {ex.sets && (
                                          <Badge variant="outline" className={cn("text-[9px] font-bold px-1.5 py-0 bg-muted/20 border-muted", isCompleted ? "opacity-50" : "text-foreground/80")}>
                                            {ex.sets} Series
                                          </Badge>
                                        )}
                                        {ex.reps && (
                                          <Badge variant="outline" className={cn("text-[9px] font-bold px-1.5 py-0 bg-muted/20 border-muted", isCompleted ? "opacity-50" : "text-foreground/80")}>
                                            {ex.reps} Reps
                                          </Badge>
                                        )}
                                        {ex.rest && (
                                          <Badge variant="outline" className={cn("text-[9px] font-bold px-1.5 py-0 bg-muted/20 border-muted flex items-center gap-1", isCompleted ? "opacity-50" : "text-foreground/80")}>
                                            <Timer className="w-2.5 h-2.5" />
                                            <span>{ex.rest}</span>
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    {ex.notes && (
                                      <p className="text-xs text-muted-foreground leading-relaxed italic">{ex.notes}</p>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}

                    {noDayExercises.length > 0 && (
                      <div className="space-y-3">
                        {Object.keys(groupedExercises).length > 0 && (
                          <h3 className="text-sm font-bold text-foreground/80 flex items-center gap-2 border-b border-muted/30 pb-1 mt-4">
                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                            Ejercicios Generales
                          </h3>
                        )}
                        <div className="space-y-3">
                          {noDayExercises.sort((a, b) => a.order - b.order).map((ex) => {
                            const isCompleted = !!completedExercises[ex.id]
                            return (
                              <div 
                                key={ex.id}
                                onClick={() => toggleComplete(ex.id)}
                                className={cn(
                                  "flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer select-none",
                                  isCompleted 
                                    ? "bg-black/5 border-white/20 opacity-60 text-muted-foreground" 
                                    : "bg-white/40 hover:bg-white/60 border-white/30 shadow-sm hover:shadow-md hover:-translate-y-0.5 backdrop-blur-md"
                                )}
                              >
                                {/* Checkbox Circle */}
                                <div className={cn(
                                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
                                  isCompleted 
                                    ? "border-emerald-500 bg-emerald-500 text-white" 
                                    : "border-muted-foreground/30 bg-background"
                                )}>
                                  {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5">
                                    <h4 className={cn("text-sm font-bold truncate text-foreground/90", isCompleted && "line-through text-muted-foreground")}>
                                      {ex.name}
                                    </h4>
                                    {/* Badges Row */}
                                    <div className="flex gap-1.5 flex-wrap shrink-0">
                                      {ex.sets && (
                                        <Badge variant="outline" className={cn("text-[9px] font-bold px-1.5 py-0 bg-muted/20 border-muted", isCompleted ? "opacity-50" : "text-foreground/80")}>
                                          {ex.sets} Series
                                        </Badge>
                                      )}
                                      {ex.reps && (
                                        <Badge variant="outline" className={cn("text-[9px] font-bold px-1.5 py-0 bg-muted/20 border-muted", isCompleted ? "opacity-50" : "text-foreground/80")}>
                                          {ex.reps} Reps
                                        </Badge>
                                      )}
                                      {ex.rest && (
                                        <Badge variant="outline" className={cn("text-[9px] font-bold px-1.5 py-0 bg-muted/20 border-muted flex items-center gap-1", isCompleted ? "opacity-50" : "text-foreground/80")}>
                                          <Timer className="w-2.5 h-2.5" />
                                          <span>{ex.rest}</span>
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  {ex.notes && (
                                    <p className="text-xs text-muted-foreground leading-relaxed italic">{ex.notes}</p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* History Grid */}
      {history.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-muted-foreground/60 rounded-full" />
            Historial de Rutinas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {history.map((w) => (
              <Card
                key={w.id}
                onClick={() => handleViewWorkout(w)}
                className="shadow-sm opacity-80 hover:opacity-100 transition-all hover:shadow-md border border-white/30 bg-white/20 backdrop-blur-md cursor-pointer group"
              >
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1 truncate">
                    <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">{w.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Finalizado el {formatDate(w.assignedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleViewWorkout(w)}
                      className="shrink-0 text-muted-foreground hover:text-primary"
                      disabled={isLoadingWorkout}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0 uppercase tracking-wide">Archivada</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoadingWorkout && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 backdrop-blur-xs">
          <Loader label="Cargando rutina..." />
        </div>,
        document.body
      )}

      {/* View Workout Modal */}
      {selectedWorkoutForView && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl max-w-4xl w-full rounded-[2rem] shadow-2xl border border-orange-100/60 overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-orange-100/40 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Dumbbell className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-extrabold text-lg text-[#2D1E1B]">{selectedWorkoutForView.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    Rutina asignada el {formatDate(selectedWorkoutForView.assignedAt)}
                    {selectedWorkoutForView.daysPerWeek && ` · ${selectedWorkoutForView.daysPerWeek} días/sem`}
                    {selectedWorkoutForView.duration && ` · ${selectedWorkoutForView.duration} min`} (Archivada)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedWorkoutForView(null)}
                className="text-muted-foreground hover:text-primary transition-colors text-lg font-bold p-1"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-grow bg-muted/5 space-y-6">
              {selectedWorkoutForView.description && (
                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 text-sm text-[#2D1E1B] leading-relaxed">
                  <p className="font-bold text-xs uppercase tracking-wider text-primary mb-1">Pautas y Notas Generales</p>
                  {selectedWorkoutForView.description}
                </div>
              )}
              
              <div className="space-y-6">
                {(() => {
                  const viewGrouped: Record<string, WorkoutExercise[]> = {}
                  const viewNoDay: WorkoutExercise[] = []
                  selectedWorkoutForView.exercises?.forEach((ex) => {
                    if (ex.day && DAYS_ORDER.includes(ex.day)) {
                      if (!viewGrouped[ex.day]) viewGrouped[ex.day] = []
                      viewGrouped[ex.day].push(ex)
                    } else {
                      viewNoDay.push(ex)
                    }
                  })

                  return (
                    <>
                      {DAYS_ORDER.map((day) => {
                        const dayExs = viewGrouped[day]
                        if (!dayExs || dayExs.length === 0) return null
                        return (
                          <div key={day} className="space-y-3">
                            <h4 className="text-xs font-extrabold text-primary flex items-center gap-2 border-b border-primary/20 pb-1 uppercase tracking-wider">
                              <Calendar className="w-3.5 h-3.5" />
                              {day}
                            </h4>
                            <div className="space-y-3">
                              {dayExs.sort((a, b) => a.order - b.order).map((ex) => (
                                <div key={ex.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/30 bg-white/40 shadow-sm backdrop-blur-md animate-in fade-in duration-150">
                                  <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5">
                                      <h5 className="text-sm font-bold text-foreground/90">{ex.name}</h5>
                                      <div className="flex gap-1.5 flex-wrap shrink-0">
                                        {ex.sets && <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 bg-muted/20 border-muted text-foreground/80">{ex.sets} Series</Badge>}
                                        {ex.reps && <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 bg-muted/20 border-muted text-foreground/80">{ex.reps} Reps</Badge>}
                                        {ex.rest && (
                                          <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 bg-muted/20 border-muted flex items-center gap-1 text-foreground/80">
                                            <Timer className="w-2.5 h-2.5" />
                                            <span>{ex.rest}</span>
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    {ex.notes && <p className="text-xs text-muted-foreground leading-relaxed italic">{ex.notes}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}

                      {viewNoDay.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-extrabold text-foreground/80 flex items-center gap-2 border-b border-muted/30 pb-1 uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Ejercicios Generales
                          </h4>
                          <div className="space-y-3">
                            {viewNoDay.sort((a, b) => a.order - b.order).map((ex) => (
                              <div key={ex.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/30 bg-white/40 shadow-sm backdrop-blur-md animate-in fade-in duration-150">
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5">
                                    <h5 className="text-sm font-bold text-foreground/90">{ex.name}</h5>
                                    <div className="flex gap-1.5 flex-wrap shrink-0">
                                      {ex.sets && <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 bg-muted/20 border-muted text-foreground/80">{ex.sets} Series</Badge>}
                                      {ex.reps && <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 bg-muted/20 border-muted text-foreground/80">{ex.reps} Reps</Badge>}
                                      {ex.rest && (
                                        <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 bg-muted/20 border-muted flex items-center gap-1 text-foreground/80">
                                          <Timer className="w-2.5 h-2.5" />
                                          <span>{ex.rest}</span>
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  {ex.notes && <p className="text-xs text-muted-foreground leading-relaxed italic">{ex.notes}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-orange-100/40 flex justify-end bg-gray-50/50">
              <Button onClick={() => setSelectedWorkoutForView(null)} size="sm" className="rounded-full shadow-sm">
                Cerrar
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
