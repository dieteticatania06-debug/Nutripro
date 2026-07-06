'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { workoutSchema, type WorkoutInput } from '@nutripro/shared'
import type { Workout } from '@nutripro/shared'
import { workoutsApi, adminUsersApi, ApiError } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { formatDate, LEVEL_ES, getAvatarUrl, cn } from '@/lib/utils'
import Image from 'next/image'
import { Plus, X, PlusCircle, Trash2, Search, ChevronDown, ChevronUp, Dumbbell, Pencil, Sparkles, Crown, Shield, Activity, Archive, Calendar } from 'lucide-react'

interface ClientOption {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role?: string
  avatarUrl?: string | null
  plan: 'basico' | 'pro' | 'elite' | null
}
interface ExerciseForm { name: string; sets: string; reps: string; rest: string; notes: string; day: string }

const planBadgeProps: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' }> = {
  basico: { label: 'Básico', variant: 'default' },
  pro: { label: 'Pro', variant: 'warning' },
  elite: { label: 'Élite', variant: 'success' },
}

import { Loader } from '@/components/ui/loader'
import { useAdminDashboardStore } from '@/features/dashboard/store/dashboardStore'

export default function AdminRutinasPage() {
  const {
    workouts: storeWorkouts,
    clients: storeClients,
    isLoaded,
    workoutsLoaded,
    clientsLoaded,
    reloadWorkouts,
    reloadClients
  } = useAdminDashboardStore()

  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [isLoading, setIsLoading] = useState(!workoutsLoaded || !clientsLoaded)
  const [exercises, setExercises] = useState<ExerciseForm[]>([{ name: '', sets: '', reps: '', rest: '', notes: '', day: 'Lunes' }])
  const [activeExerciseTab, setActiveExerciseTab] = useState<string>('Lunes')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null)
  const [editorClientId, setEditorClientId] = useState<string | null>(null)
  const [editingWorkout, setEditingWorkout] = useState<Workout | undefined>(undefined)
  const [loadedWorkouts, setLoadedWorkouts] = useState<Record<string, any>>({})
  const [workoutToDelete, setWorkoutToDelete] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isGeneratingAi, setIsGeneratingAi] = useState<Record<string, boolean>>({})

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<WorkoutInput>({
    resolver: zodResolver(workoutSchema),
    defaultValues: { userId: '', exercises: [] } as Partial<WorkoutInput>,
  })

  const load = async () => {
    setIsLoading(true)
    try {
      const promises: Promise<any>[] = []
      if (!workoutsLoaded) promises.push(reloadWorkouts())
      if (!clientsLoaded) promises.push(reloadClients())
      await Promise.all(promises)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isLoaded) {
      if (!workoutsLoaded || !clientsLoaded) {
        load()
      } else {
        setWorkouts(storeWorkouts)
        setClients(storeClients)
        setIsLoading(false)
      }
    }
  }, [isLoaded, workoutsLoaded, clientsLoaded, storeWorkouts, storeClients])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (workoutToDelete) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [workoutToDelete])

  // Automatically fetch full details for expanded client's workouts
  useEffect(() => {
    if (expandedClientId) {
      const clientWorkouts = workouts.filter((w) => w.userId === expandedClientId)
      clientWorkouts.forEach(async (w) => {
        if (!loadedWorkouts[w.id]) {
          try {
            const full = await workoutsApi.get(w.id)
            setLoadedWorkouts(prev => ({ ...prev, [w.id]: full }))
          } catch (e) {
            console.error('Error fetching full workout details:', e)
          }
        }
      })
    }
  }, [expandedClientId, workouts, loadedWorkouts])

  const addExercise = () => setExercises((prev) => [...prev, { name: '', sets: '', reps: '', rest: '', notes: '', day: activeExerciseTab === 'Otros' ? '' : activeExerciseTab }])
  const removeExercise = (i: number) => setExercises((prev) => prev.filter((_, idx) => idx !== i))
  const updateExercise = (i: number, field: keyof ExerciseForm, value: string) => {
    setExercises((prev) => prev.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex))
  }

  const onSubmit = async (data: any) => {
    setIsSubmitting(true)
    try {
      const exerciseData = exercises
        .filter((ex) => ex.name.trim())
        .map((ex, i) => ({
          name: ex.name,
          sets: ex.sets ? parseInt(ex.sets) : null,
          reps: ex.reps || null,
          rest: ex.rest || null,
          notes: ex.notes || null,
          day: ex.day || null,
          order: i,
        }))
      if (editingWorkout?.id) {
        await workoutsApi.update(editingWorkout.id, { ...data, exercises: exerciseData })
        toast({ title: 'Rutina actualizada' })
      } else {
        await workoutsApi.create({ ...data, exercises: exerciseData })
        toast({ title: 'Rutina creada y asignada' })
      }
      closeEditor()
      await load()
    } catch (err) {
      toast({ title: 'Error', description: err instanceof ApiError ? err.message : 'Error', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = (id: string) => {
    setWorkoutToDelete(id)
  }

  const confirmDelete = async () => {
    if (!workoutToDelete) return
    try {
      await workoutsApi.delete(workoutToDelete)
      setWorkouts((prev) => prev.filter((w) => w.id !== workoutToDelete))
      toast({ title: 'Rutina eliminada' })
    } catch {
      toast({ title: 'Error al eliminar', variant: 'destructive' })
    } finally {
      setWorkoutToDelete(null)
    }
  }

  const filteredClients = clients.filter((c) => {
    const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.toLowerCase()
    const email = c.email.toLowerCase()
    const query = search.toLowerCase()
    return name.includes(query) || email.includes(query)
  })

  const handleGenerateAi = async (clientId: string) => {
    setIsGeneratingAi((prev) => ({ ...prev, [clientId]: true }))
    toast({ title: 'Generando rutina con IA...', description: 'Esto puede tardar unos segundos' })
    try {
      const newWorkout = await workoutsApi.generateAi(clientId)
      toast({ title: 'Rutina generada con éxito', description: `Se ha creado y asignado: ${newWorkout.title}` })
      setExpandedClientId(clientId)
      await load()
    } catch (err) {
      toast({
        title: 'Error al generar rutina',
        description: err instanceof ApiError ? err.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingAi((prev) => ({ ...prev, [clientId]: false }))
    }
  }

  const openNewWorkout = (clientId: string) => {
    setExpandedClientId(clientId)
    setEditorClientId(clientId)
    setEditingWorkout(undefined)
    reset({
      userId: clientId,
      title: '',
      level: undefined,
      daysPerWeek: undefined,
      duration: undefined,
      description: undefined,
      exercises: []
    } as Partial<WorkoutInput>)
    setExercises([{ name: '', sets: '', reps: '', rest: '', notes: '', day: 'Lunes' }])
    setActiveExerciseTab('Lunes')
  }

  const openEditWorkout = async (w: Workout) => {
    setExpandedClientId(w.userId)
    setEditorClientId(w.userId)
    setEditingWorkout(w)
    reset({
      userId: w.userId,
      title: w.title.replace(/^Borrador:\s*/i, ''),
      level: w.level ?? undefined,
      daysPerWeek: w.daysPerWeek ?? undefined,
      duration: w.duration ?? undefined,
      description: w.description ?? undefined,
      exercises: []
    } as Partial<WorkoutInput>)
    
    try {
      const full = await workoutsApi.get(w.id)
      if (full && full.exercises && full.exercises.length > 0) {
        setExercises(full.exercises.map(ex => ({
          name: ex.name,
          sets: ex.sets?.toString() || '',
          reps: ex.reps || '',
          rest: ex.rest || '',
          notes: ex.notes || '',
          day: ex.day || '',
        })))
        const firstActiveDay = full.exercises.find(ex => ex.day)?.day || 'Lunes'
        setActiveExerciseTab(firstActiveDay)
      } else {
        setExercises([{ name: '', sets: '', reps: '', rest: '', notes: '', day: 'Lunes' }])
        setActiveExerciseTab('Lunes')
      }
    } catch {
      setExercises([{ name: '', sets: '', reps: '', rest: '', notes: '', day: 'Lunes' }])
      setActiveExerciseTab('Lunes')
    }
  }

  const closeEditor = () => {
    setEditorClientId(null)
    setEditingWorkout(undefined)
    reset()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Rutinas</h1>
          <p className="text-muted-foreground">Crear y asignar programas de entrenamiento</p>
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
        <Loader label="Cargando rutinas..." />
      ) : filteredClients.length === 0 ? (
        <Card className="border border-white/40 bg-white/45 backdrop-blur-xl">
          <CardContent className="text-center py-10 text-muted-foreground">
            No se encontraron clientes
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredClients.map((client) => {
            const clientWorkouts = workouts.filter((w) => w.userId === client.id)
            const activeWorkout = clientWorkouts.find((w) => w.status === 'active')
            const draftWorkout = clientWorkouts.find((w) => w.status === 'draft')
            const archivedWorkouts = clientWorkouts.filter((w) => w.status === 'archived')
            const isExpanded = expandedClientId === client.id
            const isEditing = editorClientId === client.id
            const clientName = `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() || client.email

            const fullActiveWorkout = activeWorkout ? (loadedWorkouts[activeWorkout.id] || activeWorkout) : null
            const fullDraftWorkout = draftWorkout ? (loadedWorkouts[draftWorkout.id] || draftWorkout) : null

            return (
              <Card key={client.id} className="overflow-hidden border border-white/40 bg-white/45 backdrop-blur-xl shadow-sm">
                <CardHeader
                  className="p-4 bg-white/30 cursor-pointer hover:bg-white/50 transition-colors flex flex-row items-center justify-between space-y-0"
                  onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
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
                    {activeWorkout ? (
                      <Badge variant="success" className="text-[10px] gap-1 py-0.5 px-2 rounded-full font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Activa
                      </Badge>
                    ) : draftWorkout ? (
                      <Badge variant="warning" className="text-[10px] gap-1 py-0.5 px-2 rounded-full font-medium bg-amber-500/10 text-amber-600 border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Borrador listo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] py-0.5 px-2 rounded-full font-medium">Sin pauta</Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1 bg-[#FAF5FF] hover:bg-[#F3E8FF] text-purple-700 border-purple-200 animate-pulse-subtle"
                      onClick={() => handleGenerateAi(client.id)}
                      disabled={isGeneratingAi[client.id]}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-purple-600 animate-spin-slow" />
                      {isGeneratingAi[client.id] ? 'Generando...' : 'Generar con IA'}
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => openNewWorkout(client.id)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Nueva Rutina
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="p-5 border-t space-y-6 bg-transparent">
                    {/* Form Editor Inline */}
                    {isEditing && (
                      <div className="rounded-xl border-2 border-primary/30 bg-primary/[0.02] p-5 space-y-4">
                        <p className="text-sm font-bold text-primary flex items-center gap-2">
                          <Pencil className="h-4 w-4" />
                          {editingWorkout ? 'Editando rutina activa' : 'Nueva rutina para este cliente'}
                        </p>
                        
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Título *</Label>
                              <Input placeholder="Ej: Rutina de fuerza 3x semana" {...register('title')} className="h-9" />
                              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Nivel</Label>
                              <select {...register('level')} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
                                <option value="">— Sin nivel —</option>
                                <option value="beginner">Principiante</option>
                                <option value="intermediate">Intermedio</option>
                                <option value="advanced">Avanzado</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Días/semana</Label>
                              <Input type="number" min="1" max="7" {...register('daysPerWeek', { valueAsNumber: true })} className="h-9" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Duración (min)</Label>
                              <Input type="number" {...register('duration', { valueAsNumber: true })} className="h-9" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold">Descripción</Label>
                            <Textarea placeholder="Descripción de la rutina..." {...register('description')} className="min-h-16 text-sm" />
                          </div>

                          {/* Exercises block */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <Label className="text-sm font-bold">Ejercicios</Label>
                              <Button type="button" size="sm" variant="outline" onClick={addExercise} className="bg-primary/5 hover:bg-primary/10 text-primary border-primary/20">
                                <PlusCircle className="h-4 w-4 mr-1 text-primary" /> Añadir ejercicio
                              </Button>
                            </div>

                            {/* Day Selector Tabs */}
                            <div className="flex flex-wrap gap-1 mb-4 p-1 bg-muted/40 rounded-lg border">
                              {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo', 'Otros'].map((day) => {
                                const count = exercises.filter((ex) => {
                                  if (day === 'Otros') {
                                    return !ex.day || !['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].includes(ex.day)
                                  }
                                  return ex.day === day
                                }).length

                                return (
                                  <Button
                                    key={day}
                                    type="button"
                                    variant={activeExerciseTab === day ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setActiveExerciseTab(day)}
                                    className={cn(
                                      "text-xs font-semibold px-3 py-1.5 rounded-md transition-all shrink-0 h-8",
                                      activeExerciseTab === day
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                    )}
                                  >
                                    {day}
                                    {count > 0 && (
                                      <span className={cn(
                                        "ml-1.5 px-1.5 py-0.5 text-[9px] rounded-full font-bold",
                                        activeExerciseTab === day ? "bg-white/25 text-white" : "bg-primary/10 text-primary"
                                      )}>
                                        {count}
                                      </span>
                                    )}
                                  </Button>
                                )
                              })}
                            </div>

                            <div className="space-y-3">
                              {(() => {
                                const filtered = exercises.map((ex, index) => ({ ex, index })).filter(({ ex }) => {
                                  if (activeExerciseTab === 'Otros') {
                                    return !ex.day || !['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].includes(ex.day)
                                  }
                                  return ex.day === activeExerciseTab
                                })

                                if (filtered.length === 0) {
                                  return (
                                    <div className="text-center py-8 border border-dashed rounded-lg bg-muted/5 flex flex-col items-center justify-center space-y-2">
                                      <p className="text-xs text-muted-foreground">No hay ejercicios asignados al {activeExerciseTab === 'Otros' ? 'resto de días' : activeExerciseTab} en esta rutina.</p>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="link"
                                        onClick={() => {
                                          setExercises((prev) => [
                                            ...prev,
                                            { name: '', sets: '', reps: '', rest: '', notes: '', day: activeExerciseTab === 'Otros' ? '' : activeExerciseTab }
                                          ])
                                        }}
                                        className="text-xs font-semibold text-primary"
                                      >
                                        + Añadir primer ejercicio para el {activeExerciseTab === 'Otros' ? 'día' : activeExerciseTab}
                                      </Button>
                                    </div>
                                  )
                                }

                                return filtered.map(({ ex, index }) => (
                                  <div key={index} className="grid grid-cols-12 gap-3 items-start border border-muted-foreground/15 rounded-lg p-3 bg-muted/5 hover:border-primary/20 transition-all shadow-sm">
                                    {/* Name */}
                                    <div className="col-span-12 sm:col-span-4 space-y-1">
                                      <Label className="text-xs font-semibold text-foreground/80">Ejercicio</Label>
                                      <Input
                                        value={ex.name}
                                        onChange={(e) => updateExercise(index, 'name', e.target.value)}
                                        placeholder="Sentadilla con barra"
                                        className="h-9"
                                      />
                                    </div>

                                    {/* Sets */}
                                    <div className="col-span-4 sm:col-span-2 space-y-1">
                                      <Label className="text-xs font-semibold text-foreground/80">Series</Label>
                                      <Input
                                        value={ex.sets}
                                        onChange={(e) => updateExercise(index, 'sets', e.target.value)}
                                        placeholder="4"
                                        className="h-9"
                                      />
                                    </div>

                                    {/* Reps */}
                                    <div className="col-span-4 sm:col-span-2 space-y-1">
                                      <Label className="text-xs font-semibold text-foreground/80">Reps</Label>
                                      <Input
                                        value={ex.reps}
                                        onChange={(e) => updateExercise(index, 'reps', e.target.value)}
                                        placeholder="8-12"
                                        className="h-9"
                                      />
                                    </div>

                                    {/* Rest */}
                                    <div className="col-span-4 sm:col-span-2 space-y-1">
                                      <Label className="text-xs font-semibold text-foreground/80">Descanso</Label>
                                      <Input
                                        value={ex.rest}
                                        onChange={(e) => updateExercise(index, 'rest', e.target.value)}
                                        placeholder="90s"
                                        className="h-9"
                                      />
                                    </div>

                                    {/* Day selection inside item in case they want to move it */}
                                    <div className="col-span-12 sm:col-span-2 space-y-1">
                                      <Label className="text-xs font-semibold text-foreground/80">Día</Label>
                                      <select
                                        value={ex.day || ''}
                                        onChange={(e) => updateExercise(index, 'day', e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                      >
                                        <option value="">Sin día</option>
                                        <option value="Lunes">Lunes</option>
                                        <option value="Martes">Martes</option>
                                        <option value="Miércoles">Miércoles</option>
                                        <option value="Jueves">Jueves</option>
                                        <option value="Viernes">Viernes</option>
                                        <option value="Sábado">Sábado</option>
                                        <option value="Domingo">Domingo</option>
                                      </select>
                                    </div>

                                    {/* Notes input */}
                                    <div className="col-span-11 mt-1 space-y-1">
                                      <Label className="text-[11px] font-semibold text-muted-foreground">Notas / Instrucciones adicionales</Label>
                                      <Input
                                        value={ex.notes || ''}
                                        onChange={(e) => updateExercise(index, 'notes', e.target.value)}
                                        placeholder="Ej: Foco excéntrico controlado de 3s, RIR 1"
                                        className="h-8 text-xs bg-background"
                                      />
                                    </div>

                                    {/* Delete button */}
                                    <div className="col-span-1 mt-1 flex items-end justify-center">
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                                        onClick={() => removeExercise(index)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))
                              })()}
                            </div>
                          </div>
                          
                          <div className="flex gap-2 pt-2">
                            <Button type="submit" size="sm" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Crear y Asignar'}</Button>
                            <Button type="button" size="sm" variant="outline" onClick={closeEditor}>Cancelar</Button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Draft Routine View */}
                    {draftWorkout && !isEditing && (
                      <div className="space-y-4 p-5 rounded-2xl border border-amber-200/80 bg-amber-500/[0.015] backdrop-blur-sm shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-200/50 pb-4">
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Borrador pendiente de revisión
                            </div>
                            <h3 className="text-sm font-bold text-foreground mt-1">
                              {draftWorkout.title}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              {draftWorkout.daysPerWeek && `${draftWorkout.daysPerWeek} días/sem`}
                              {draftWorkout.duration && ` · ${draftWorkout.duration} min`}
                              {draftWorkout.level && ` · ${LEVEL_ES[draftWorkout.level]}`}
                            </p>
                            {draftWorkout.description && (
                              <p className="text-xs text-muted-foreground mt-1">{draftWorkout.description}</p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1 border-amber-200 text-amber-700 hover:bg-amber-50"
                              onClick={() => openEditWorkout(draftWorkout)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Revisar/Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              className="h-8 text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white shadow-sm font-bold"
                              onClick={async () => {
                                try {
                                  const cleanTitle = draftWorkout.title.replace(/^Borrador:\s*/i, '')
                                  const full = await workoutsApi.get(draftWorkout.id)
                                  await workoutsApi.update(draftWorkout.id, {
                                    userId: draftWorkout.userId,
                                    title: cleanTitle,
                                    level: draftWorkout.level || undefined,
                                    daysPerWeek: draftWorkout.daysPerWeek || undefined,
                                    duration: draftWorkout.duration || undefined,
                                    description: draftWorkout.description || undefined,
                                    status: 'active',
                                    exercises: full.exercises || []
                                  })
                                  toast({ title: 'Rutina confirmada y enviada al cliente' })
                                  await load()
                                } catch (err) {
                                  toast({ 
                                    title: 'Error al confirmar la rutina', 
                                    description: err instanceof ApiError ? err.message : 'Error desconocido',
                                    variant: 'destructive' 
                                  })
                                }
                              }}
                            >
                              <Activity className="h-3.5 w-3.5" />
                              Confirmar y Enviar
                            </Button>
                          </div>
                        </div>
                        
                        {/* Draft exercises preview */}
                        {fullDraftWorkout && fullDraftWorkout.exercises && fullDraftWorkout.exercises.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo', 'Otros'].map(day => {
                              const dayExs = fullDraftWorkout.exercises.filter(ex => {
                                if (day === 'Otros') {
                                  return !ex.day || !['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].includes(ex.day)
                                }
                                return ex.day === day
                              })
                              if (dayExs.length === 0) return null
                              return (
                                <div key={day} className="p-3 rounded-xl border bg-white/50 backdrop-blur-md space-y-2">
                                  <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider">{day}</h4>
                                  <div className="space-y-1.5">
                                    {dayExs.map((ex, idx) => (
                                      <div key={idx} className="text-xs border-b border-muted/50 pb-1.5 last:border-0 last:pb-0">
                                        <p className="font-semibold text-foreground">{ex.name}</p>
                                        <p className="text-[10px] text-muted-foreground">
                                          {ex.sets ? `${ex.sets} series` : ''}
                                          {ex.reps ? ` x ${ex.reps}` : ''}
                                          {ex.rest ? ` (Descanso: ${ex.rest})` : ''}
                                        </p>
                                        {ex.notes && <p className="text-[10px] text-muted-foreground italic mt-0.5">Nota: {ex.notes}</p>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Active Routine View */}
                    {activeWorkout && !isEditing && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              {activeWorkout.title}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              Asignada el {formatDate(activeWorkout.assignedAt)}
                              {activeWorkout.daysPerWeek && ` · ${activeWorkout.daysPerWeek} días/sem`}
                              {activeWorkout.duration && ` · ${activeWorkout.duration} min`}
                              {activeWorkout.level && ` · ${LEVEL_ES[activeWorkout.level]}`}
                            </p>
                            {activeWorkout.description && (
                              <p className="text-xs text-muted-foreground mt-1">{activeWorkout.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1"
                              onClick={() => openEditWorkout(activeWorkout)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(activeWorkout.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Active exercises preview */}
                        {fullActiveWorkout && fullActiveWorkout.exercises && fullActiveWorkout.exercises.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo', 'Otros'].map(day => {
                              const dayExs = fullActiveWorkout.exercises.filter(ex => {
                                if (day === 'Otros') {
                                  return !ex.day || !['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].includes(ex.day)
                                }
                                return ex.day === day
                              })
                              if (dayExs.length === 0) return null
                              return (
                                <div key={day} className="p-3 rounded-xl border bg-white/50 backdrop-blur-md space-y-2">
                                  <h4 className="text-xs font-bold text-[#4A7C59] uppercase tracking-wider">{day}</h4>
                                  <div className="space-y-1.5">
                                    {dayExs.map((ex, idx) => (
                                      <div key={idx} className="text-xs border-b border-muted/50 pb-1.5 last:border-0 last:pb-0">
                                        <p className="font-semibold text-foreground">{ex.name}</p>
                                        <p className="text-[10px] text-muted-foreground">
                                          {ex.sets ? `${ex.sets} series` : ''}
                                          {ex.reps ? ` x ${ex.reps}` : ''}
                                          {ex.rest ? ` (Descanso: ${ex.rest})` : ''}
                                        </p>
                                        {ex.notes && <p className="text-[10px] text-muted-foreground italic mt-0.5">Nota: {ex.notes}</p>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Cargando ejercicios...</p>
                        )}
                      </div>
                    )}

                    {!activeWorkout && !draftWorkout && !isEditing && (
                      <div className="text-center py-6 text-muted-foreground text-sm space-y-3">
                        <Dumbbell className="h-8 w-8 mx-auto opacity-30" />
                        <p>Este cliente no tiene ninguna rutina activa asignada.</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          onClick={() => openNewWorkout(client.id)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Asignar primera rutina
                        </Button>
                      </div>
                    )}

                    {archivedWorkouts.length > 0 && (
                      <div className="space-y-2 pt-4 border-t border-muted/30">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Archive className="h-3.5 w-3.5" />
                          Historial de rutinas archivadas ({archivedWorkouts.length})
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {archivedWorkouts.map((w) => (
                            <div
                              key={w.id}
                              className="flex items-center justify-between p-3 rounded-lg border border-white/20 bg-white/20 backdrop-blur-md gap-2"
                            >
                              <div className="space-y-0.5 min-w-0">
                                <p className="text-xs font-semibold text-foreground/70 truncate">{w.title}</p>
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-2.5 w-2.5" />
                                  {formatDate(w.assignedAt)}
                                </p>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                onClick={() => handleDelete(w.id)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
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

      {mounted && workoutToDelete && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1E110A]/40 backdrop-blur-md animate-in fade-in duration-200 p-4">
          <div className="bg-white/80 border border-orange-100/40 shadow-2xl rounded-2xl max-w-sm w-full p-6 backdrop-blur-xl animate-in zoom-in-95 duration-200 space-y-4">
            <div className="space-y-2">
              <h3 className="text-base font-bold text-foreground">¿Eliminar esta rutina?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                ¿Estás seguro de que deseas eliminar esta rutina de entrenamiento? Esta acción es irreversible y no se puede deshacer.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWorkoutToDelete(null)}
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
