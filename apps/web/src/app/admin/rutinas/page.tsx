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
import { Plus, X, PlusCircle, Trash2, Search, ChevronDown, ChevronUp, Dumbbell, Pencil, Sparkles, Crown, Shield, Activity } from 'lucide-react'

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
  const [showForm, setShowForm] = useState(false)
  const [exercises, setExercises] = useState<ExerciseForm[]>([{ name: '', sets: '', reps: '', rest: '', notes: '', day: '' }])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null)
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null)
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

  const addExercise = () => setExercises((prev) => [...prev, { name: '', sets: '', reps: '', rest: '', notes: '', day: '' }])
  const removeExercise = (i: number) => setExercises((prev) => prev.filter((_, idx) => idx !== i))
  const updateExercise = (i: number, field: keyof ExerciseForm, value: string) => {
    setExercises((prev) => prev.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      if (editingWorkoutId) {
        await workoutsApi.update(editingWorkoutId, { ...data, exercises: exerciseData })
        toast({ title: 'Rutina actualizada' })
      } else {
        await workoutsApi.create({ ...data, exercises: exerciseData })
        toast({ title: 'Rutina creada y asignada' })
      }
      setShowForm(false)
      setEditingWorkoutId(null)
      reset()
      setExercises([{ name: '', sets: '', reps: '', rest: '', notes: '', day: '' }])
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

  const handleNewWorkoutForClient = (clientId: string) => {
    setEditingWorkoutId(null)
    reset({ userId: clientId, exercises: [] } as Partial<WorkoutInput>)
    setExercises([{ name: '', sets: '', reps: '', rest: '', notes: '', day: '' }])
    setValue('userId', clientId)
    setShowForm(true)
  }

  const handleEditWorkout = async (w: Workout) => {
    setEditingWorkoutId(w.id)
    setValue('userId', w.userId)
    setValue('title', w.title.replace(/^Borrador:\s*/i, ''))
    setValue('level', w.level ?? undefined)
    setValue('daysPerWeek', w.daysPerWeek ?? undefined)
    setValue('duration', w.duration ?? undefined)
    setValue('description', w.description ?? undefined)
    
    // fetch full workout details to get exercises
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
      } else {
        setExercises([{ name: '', sets: '', reps: '', rest: '', notes: '', day: '' }])
      }
    } catch {
      setExercises([{ name: '', sets: '', reps: '', rest: '', notes: '', day: '' }])
    }
    
    setExpandedClientId(w.userId)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Rutinas</h1>
          <p className="text-muted-foreground">Crear y asignar programas de entrenamiento</p>
        </div>
      </div>

      {showForm && (
        <Card className="border border-white/40 bg-white/45 backdrop-blur-xl">
          <CardHeader><CardTitle className="text-base">{editingWorkoutId ? 'Editar Rutina' : 'Nueva Rutina'}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <Label>Asignar a cliente *</Label>
                <select {...register('userId')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">— Seleccionar —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{`${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.email}</option>
                  ))}
                </select>
                {errors.userId && <p className="text-xs text-destructive">{errors.userId.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Título *</Label>
                  <Input placeholder="Ej: Rutina de fuerza 3x semana" {...register('title')} />
                  {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Nivel</Label>
                  <select {...register('level')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">— Sin nivel —</option>
                    <option value="beginner">Principiante</option>
                    <option value="intermediate">Intermedio</option>
                    <option value="advanced">Avanzado</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Días/semana</Label>
                  <Input type="number" min="1" max="7" {...register('daysPerWeek', { valueAsNumber: true })} />
                </div>
                <div className="space-y-1">
                  <Label>Duración (min)</Label>
                  <Input type="number" {...register('duration', { valueAsNumber: true })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Descripción</Label>
                <Textarea placeholder="Descripción de la rutina..." {...register('description')} />
              </div>

              {/* Exercises */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Ejercicios</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addExercise}>
                    <PlusCircle className="h-4 w-4 mr-1" /> Añadir ejercicio
                  </Button>
                </div>
                <div className="space-y-3">
                  {exercises.map((ex, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end border rounded-md p-3">
                      <div className="col-span-12 sm:col-span-3 space-y-1">
                        <Label className="text-xs">Ejercicio</Label>
                        <Input value={ex.name} onChange={(e) => updateExercise(i, 'name', e.target.value)} placeholder="Sentadilla" />
                      </div>
                      <div className="col-span-12 sm:col-span-2 space-y-1">
                        <Label className="text-xs">Día</Label>
                        <select
                          value={ex.day || ''}
                          onChange={(e) => updateExercise(i, 'day', e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                      <div className="col-span-3 sm:col-span-2 space-y-1">
                        <Label className="text-xs">Series</Label>
                        <Input value={ex.sets} onChange={(e) => updateExercise(i, 'sets', e.target.value)} placeholder="3" />
                      </div>
                      <div className="col-span-3 sm:col-span-2 space-y-1">
                        <Label className="text-xs">Reps</Label>
                        <Input value={ex.reps} onChange={(e) => updateExercise(i, 'reps', e.target.value)} placeholder="8-12" />
                      </div>
                      <div className="col-span-3 sm:col-span-2 space-y-1">
                        <Label className="text-xs">Descanso</Label>
                        <Input value={ex.rest} onChange={(e) => updateExercise(i, 'rest', e.target.value)} placeholder="60s" />
                      </div>
                      <div className="col-span-3 sm:col-span-1 flex items-end justify-center">
                        {exercises.length > 1 && (
                          <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => removeExercise(i)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Crear y Asignar'}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

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
        <Card><CardContent className="text-center py-8 text-muted-foreground">No se encontraron clientes</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {filteredClients.map((client) => {
            const clientWorkouts = workouts.filter((w) => w.userId === client.id)
            const isExpanded = expandedClientId === client.id
            const clientName = `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() || client.email

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
                    {clientWorkouts.some((w) => w.status === 'active') ? (
                      <Badge variant="success" className="text-[10px] gap-1 py-0.5 px-2 rounded-full font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Activa
                      </Badge>
                    ) : clientWorkouts.some((w) => w.status === 'draft') ? (
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
                    <Button size="sm" variant="outline" className="h-8" onClick={() => handleNewWorkoutForClient(client.id)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Asignar Rutina
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
                  <CardContent className="p-4 border-t divide-y divide-muted/50 bg-transparent">
                    {clientWorkouts.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Este cliente aún no tiene rutinas asignadas.</p>
                    ) : (
                      clientWorkouts.map((w) => (
                        <div key={w.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-foreground">{w.title}</p>
                              <Badge
                                variant={w.status === 'draft' ? 'warning' : (w.status === 'active' ? 'success' : 'secondary')}
                                className={cn(
                                  "text-[10px] py-0 px-1.5",
                                  w.status === 'draft' && "bg-amber-500/10 text-amber-600 border-amber-200"
                                )}
                              >
                                {w.status === 'draft' ? 'Borrador' : (w.status === 'active' ? 'Activa' : 'Archivada')}
                              </Badge>
                              {w.level && <Badge variant="outline" className="text-[10px]">{LEVEL_ES[w.level]}</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Asignada el {formatDate(w.assignedAt)}
                              {w.daysPerWeek && ` · ${w.daysPerWeek} días/sem`}
                            </p>
                          </div>
                          <div className="flex gap-1.5 shrink-0 items-center">
                            {w.status === 'draft' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs gap-1 border-amber-200 text-amber-700 hover:bg-amber-50 bg-amber-500/[0.02]"
                                onClick={async () => {
                                  try {
                                    const cleanTitle = w.title.replace(/^Borrador:\s*/i, '')
                                    // Fetch full workout details to keep exercises when updating status
                                    const full = await workoutsApi.get(w.id)
                                    await workoutsApi.update(w.id, {
                                      userId: w.userId,
                                      title: cleanTitle,
                                      level: w.level || undefined,
                                      daysPerWeek: w.daysPerWeek || undefined,
                                      duration: w.duration || undefined,
                                      description: w.description || undefined,
                                      status: 'active',
                                      exercises: full.exercises || []
                                    })
                                    toast({ title: 'Rutina confirmada y enviada al cliente' })
                                    await load()
                                  } catch (err) {
                                    toast({ title: 'Error al confirmar la rutina', variant: 'destructive' })
                                  }
                                }}
                              >
                                <Activity className="h-3.5 w-3.5" />
                                Confirmar y Enviar
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => handleEditWorkout(w)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                              onClick={() => handleDelete(w.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
      {/* Translucent Confirmation Modal */}
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
