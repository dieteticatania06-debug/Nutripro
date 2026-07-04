'use client'

import { useEffect, useState, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'next/navigation'
import type { Diet, Questionnaire } from '@nutripro/shared'
import { dietsApi, adminUsersApi, questionnairesApi, ApiError } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { formatDate, parseDietContent, getAvatarUrl, getDietAverageCalories } from '@/lib/utils'
import type { DietContent, DietContentV2, WeeklyPlan, WeeklyPlanV2, MealDetail } from '@/lib/utils'
import Image from 'next/image'
import { DietTableReadOnly } from '@/components/diets/DietTableReadOnly'
import {
  Plus, X, Search, Utensils, ChevronDown, ChevronUp,
  Pencil, Save, Flame, Calendar, Archive, Sparkles,
  Crown, Shield, Activity, Loader2
} from 'lucide-react'
import { Loader } from '@/components/ui/loader'

// ─── Constants ──────────────────────────────────────────────────────────────

const DAYS = [
  { key: 'monday',    label: 'Lunes' },
  { key: 'tuesday',  label: 'Martes' },
  { key: 'wednesday',label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday',   label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday',   label: 'Domingo' },
] as const

const MEALS = [
  { key: 'breakfast',   label: 'Desayuno' },
  { key: 'mid_morning', label: 'Media Mañana' },
  { key: 'lunch',       label: 'Comida' },
  { key: 'snack',       label: 'Merienda' },
  { key: 'dinner',      label: 'Cena' },
] as const

type DayKey  = typeof DAYS[number]['key']
type MealKey = typeof MEALS[number]['key']

const planBadgeProps: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' }> = {
  basico: { label: 'Básico', variant: 'default' },
  pro: { label: 'Pro', variant: 'warning' },
  elite: { label: 'Élite', variant: 'success' },
}

function emptyWeeklyPlan(): WeeklyPlan {
  const plan = {} as WeeklyPlan
  for (const day of DAYS) {
    plan[day.key] = {} as Record<MealKey, string>
    for (const meal of MEALS) {
      plan[day.key][meal.key] = ''
    }
  }
  return plan
}

function getInitialWeeklyPlan(existingDiet?: Diet): WeeklyPlan {
  if (!existingDiet) return emptyWeeklyPlan()
  const parsed = parseDietContent(existingDiet.content)
  if (parsed?.version === 2) {
    const plan = emptyWeeklyPlan()
    for (const d of DAYS) {
      for (const m of MEALS) {
        plan[d.key][m.key] = parsed.weeklyPlan[d.key]?.meals?.[m.key]?.text ?? ''
      }
    }
    return plan
  }
  if (parsed?.version === 1) {
    return parsed.weeklyPlan
  }
  // Fallback to plain text
  const plan = emptyWeeklyPlan()
  plan.monday.lunch = existingDiet.content
  return plan
}

function getInitialCellMacros(existingDiet?: Diet): Record<string, { protein: number; carbs: number; fat: number; calories: number }> {
  const macros: Record<string, { protein: number; carbs: number; fat: number; calories: number }> = {}
  if (existingDiet) {
    const parsed = parseDietContent(existingDiet.content)
    if (parsed?.version === 2) {
      for (const d of DAYS) {
        for (const m of MEALS) {
          const mData = parsed.weeklyPlan[d.key]?.meals?.[m.key]
          if (mData?.macros) {
            macros[`${d.key}-${m.key}`] = mData.macros
          }
        }
      }
    }
  }
  return macros
}

function serializeDietContentV2(
  plan: WeeklyPlan, 
  notes: string, 
  cellMacros: Record<string, { protein: number; carbs: number; fat: number; calories: number }>
): string {
  const updatedWeeklyPlan = {} as WeeklyPlanV2
  for (const d of DAYS) {
    const dayMeals = {} as Record<MealKey, MealDetail>
    let totalProt = 0
    let totalCarb = 0
    let totalFat = 0
    let totalKcal = 0

    for (const m of MEALS) {
      const editedText = plan[d.key][m.key]
      const macro = cellMacros[`${d.key}-${m.key}`] || { protein: 0, carbs: 0, fat: 0, calories: 0 }
      dayMeals[m.key] = {
        text: editedText,
        macros: macro
      }
      totalProt += macro.protein
      totalCarb += macro.carbs
      totalFat += macro.fat
      totalKcal += macro.calories
    }

    updatedWeeklyPlan[d.key] = {
      meals: dayMeals,
      dayTotals: {
        protein: totalProt,
        carbs: totalCarb,
        fat: totalFat,
        calories: totalKcal
      }
    }
  }

  const content: DietContentV2 = { version: 2, weeklyPlan: updatedWeeklyPlan, notes }
  return JSON.stringify(content)
}

function serializeDietContent(plan: WeeklyPlan, notes: string): string {
  const content: DietContent = { version: 1, weeklyPlan: plan, notes }
  return JSON.stringify(content)
}

// Shared component imported from '@/components/diets/DietTableReadOnly'

// ─── Diet Table — Editor ─────────────────────────────────────────────────────

interface DietEditorProps {
  clientId: string
  existingDiet?: Diet
  onSaved: () => void
  onCancel: () => void
}

function DietEditor({ clientId, existingDiet, onSaved, onCancel }: DietEditorProps) {
  const [title, setTitle]             = useState(existingDiet?.title ?? '')
  const [description, setDescription] = useState(existingDiet?.description ?? '')
  const [totalCalories, setTotalCalories] = useState<string>(
    existingDiet?.totalCalories != null ? String(existingDiet.totalCalories) : ''
  )
  const [weeklyPlan, setWeeklyPlan]   = useState<WeeklyPlan>(() => getInitialWeeklyPlan(existingDiet))
  const [cellMacros, setCellMacros]   = useState<Record<string, { protein: number; carbs: number; fat: number; calories: number }>>(() => getInitialCellMacros(existingDiet))
  const [notes, setNotes]             = useState(() => {
    if (existingDiet) {
      const parsed = parseDietContent(existingDiet.content)
      return parsed?.notes ?? ''
    }
    return ''
  })
  const [isSaving, setIsSaving]       = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [activeDay, setActiveDay]     = useState<DayKey>('monday')

  const setCell = (day: DayKey, meal: MealKey, value: string) => {
    setWeeklyPlan((prev) => ({
      ...prev,
      [day]: { ...prev[day], [meal]: value },
    }))
    setCellMacros((prev) => ({
      ...prev,
      [`${day}-${meal}`]: { protein: 0, carbs: 0, fat: 0, calories: 0 }
    }))
  }

  const handleRecalculate = async () => {
    setIsRecalculating(true)
    try {
      const initialPlan = getInitialWeeklyPlan(existingDiet)
      const cellsToRecalculate: { day: string; meal: string; text: string }[] = []

      for (const d of DAYS) {
        const dayPlan = weeklyPlan[d.key]
        const initDayPlan = initialPlan[d.key]
        for (const m of MEALS) {
          const text = dayPlan[m.key]?.trim()
          const initText = initDayPlan[m.key]?.trim()
          const key = `${d.key}-${m.key}`
          const currentMacro = cellMacros[key]

          const hasTextChanged = text !== initText
          const hasNoMacro = !currentMacro || (currentMacro.calories === 0 && currentMacro.protein === 0)

          if (text && (hasTextChanged || hasNoMacro)) {
            cellsToRecalculate.push({ day: d.key, meal: m.key, text })
          }
        }
      }

      if (cellsToRecalculate.length === 0) {
        toast({ title: 'No hay cambios en los alimentos para recalcular' })
        return
      }

      const response = await dietsApi.recalculateMacros(cellsToRecalculate)

      setCellMacros((prev) => {
        const next = { ...prev }
        response.meals.forEach((item) => {
          next[`${item.day}-${item.meal}`] = item.macros
        })

        // Recalculate daily average to update totalCalories
        let totalCal = 0
        let count = 0
        DAYS.forEach((d) => {
          let dayCal = 0
          MEALS.forEach((m) => {
            const mCal = next[`${d.key}-${m.key}`]?.calories ?? 0
            const mCalNum = typeof mCal === 'number' ? mCal : Number(mCal)
            if (!isNaN(mCalNum)) {
              dayCal += mCalNum
            }
          })
          if (dayCal > 0) {
            totalCal += dayCal
            count++
          }
        })
        const avgCal = count > 0 ? Math.round(totalCal / count) : 0
        if (avgCal > 0) {
          setTotalCalories(String(avgCal))
        }

        return next
      })

      toast({ title: `Macros recalculados con éxito (${cellsToRecalculate.length} comidas)` })
    } catch (err: any) {
      toast({
        title: 'Error al recalcular macros',
        description: err instanceof ApiError ? err.message : 'Error desconocido',
        variant: 'destructive'
      })
    } finally {
      setIsRecalculating(false)
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: 'El título es obligatorio', variant: 'destructive' })
      return
    }
    setIsSaving(true)
    try {
      const content = serializeDietContentV2(weeklyPlan, notes, cellMacros)

      // Automatically calculate average calories from cellMacros
      let totalCal = 0
      let count = 0
      DAYS.forEach((d) => {
        let dayCal = 0
        MEALS.forEach((m) => {
          const mCal = cellMacros[`${d.key}-${m.key}`]?.calories ?? 0
          const mCalNum = typeof mCal === 'number' ? mCal : Number(mCal)
          if (!isNaN(mCalNum)) {
            dayCal += mCalNum
          }
        })
        if (dayCal > 0) {
          totalCal += dayCal
          count++
        }
      })
      const computedAvgCalories = count > 0 ? Math.round(totalCal / count) : 0

      const payload = {
        userId: clientId,
        title: title.trim(),
        description: description.trim() || null,
        content,
        totalCalories: computedAvgCalories > 0 ? computedAvgCalories : (totalCalories ? Number(totalCalories) : null),
        status: 'active' as const,
      }
      if (existingDiet) {
        await dietsApi.update(existingDiet.id, payload)
        toast({ title: 'Dieta actualizada correctamente' })
      } else {
        await dietsApi.create(payload)
        toast({ title: 'Dieta creada y asignada' })
      }
      onSaved()
    } catch (err) {
      toast({
        title: 'Error al guardar',
        description: err instanceof ApiError ? err.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Meta fields */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 space-y-1">
          <Label htmlFor="diet-title">Título de la dieta *</Label>
          <Input
            id="diet-title"
            placeholder="Ej: Dieta hipocalórica fase 1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="diet-kcal">Calorías diarias (kcal)</Label>
          <Input
            id="diet-kcal"
            type="number"
            placeholder="1800"
            value={totalCalories}
            onChange={(e) => setTotalCalories(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="diet-desc">Descripción / objetivo</Label>
        <Input
          id="diet-desc"
          placeholder="Objetivo principal de esta pauta..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Day tabs */}
      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
          Plan semanal — edita celda por celda
        </p>
        <div className="flex flex-wrap gap-1 mb-4">
          {DAYS.map((d) => (
            <button
              key={d.key}
              onClick={() => setActiveDay(d.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeDay === d.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Meal inputs for active day */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {MEALS.map((m) => (
            <div key={m.key} className="space-y-1">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {m.label}
              </Label>
              <Textarea
                rows={4}
                placeholder={`${m.label} del ${DAYS.find((d) => d.key === activeDay)?.label}...`}
                value={weeklyPlan[activeDay]?.[m.key] ?? ''}
                onChange={(e) => setCell(activeDay, m.key, e.target.value)}
                className="text-xs resize-none leading-relaxed"
              />
              {(() => {
                const macro = cellMacros[`${activeDay}-${m.key}`]
                if (macro && (macro.calories > 0 || macro.protein > 0)) {
                  return (
                    <div className="text-[10px] font-mono text-muted-foreground bg-muted/40 p-1.5 rounded border border-orange-100/10 flex justify-between mt-1 select-none">
                      <span className="text-primary font-bold">{macro.calories} kcal</span>
                      <span>P: {macro.protein}g</span>
                      <span>H: {macro.carbs}g</span>
                      <span>G: {macro.fat}g</span>
                    </div>
                  )
                }
                return null
              })()}
            </div>
          ))}
        </div>
      </div>

      {/* General notes */}
      <div className="space-y-1">
        <Label htmlFor="diet-notes">Notas / observaciones generales</Label>
        <Textarea
          id="diet-notes"
          rows={3}
          placeholder="Instrucciones generales, alergias a tener en cuenta, cantidades..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="text-sm"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          onClick={handleRecalculate}
          disabled={isRecalculating || isSaving}
          variant="outline"
          className="gap-2 border-primary/40 hover:bg-primary/5 text-primary"
        >
          {isRecalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Recalcular Dieta
        </Button>
        <Button onClick={handleSave} disabled={isSaving || isRecalculating} className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? 'Guardando...' : existingDiet ? 'Actualizar Dieta' : 'Crear y Asignar'}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={isSaving || isRecalculating}>
          Cancelar
        </Button>
        {!existingDiet && (
          <p className="text-xs text-muted-foreground ml-1">
            La dieta anterior (si existe) se archivará automáticamente.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Client Interfaces ───────────────────────────────────────────────────────

interface ClientOption {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role?: string
  avatarUrl?: string | null
  plan?: 'basico' | 'pro' | 'elite' | null
}

// ─── Main Content ────────────────────────────────────────────────────────────

import { useAdminDashboardStore } from '@/features/dashboard/store/dashboardStore'

function AdminDietasContent() {
  const searchParams = useSearchParams()
  const preselectedUserId = searchParams.get('userId') ?? ''

  const {
    diets: storeDiets,
    clients: storeClients,
    questionnaires: storeQuestionnaires,
    isLoaded,
    dietsLoaded,
    clientsLoaded,
    questionnairesLoaded,
    reloadDiets,
    reloadClients,
    reloadQuestionnaires
  } = useAdminDashboardStore()
  const [diets, setDiets]       = useState<Diet[]>([])
  const [clients, setClients]   = useState<ClientOption[]>([])
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([])
  const [isLoading, setIsLoading] = useState(!dietsLoaded || !clientsLoaded || !questionnairesLoaded)
  const [isGeneratingAi, setIsGeneratingAi] = useState<Record<string, boolean>>({})
  const [dietToDelete, setDietToDelete] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [search, setSearch]     = useState('')
  const [expandedClientId, setExpandedClientId] = useState<string | null>(
    preselectedUserId || null
  )
  // which client is currently in "editor mode" and (optionally) which diet to edit
  const [editorClientId, setEditorClientId]   = useState<string | null>(null)
  const [editingDiet, setEditingDiet]         = useState<Diet | undefined>(undefined)

  const load = async () => {
    setIsLoading(true)
    try {
      const promises: Promise<any>[] = []
      if (!dietsLoaded) promises.push(reloadDiets())
      if (!clientsLoaded) promises.push(reloadClients())
      if (!questionnairesLoaded) promises.push(reloadQuestionnaires())
      await Promise.all(promises)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isLoaded) {
      if (!dietsLoaded || !clientsLoaded || !questionnairesLoaded) {
        load()
      } else {
        setDiets(storeDiets)
        setClients(storeClients)
        setQuestionnaires(storeQuestionnaires)
        setIsLoading(false)
      }
    }
  }, [isLoaded, dietsLoaded, clientsLoaded, questionnairesLoaded, storeDiets, storeClients, storeQuestionnaires])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (dietToDelete) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [dietToDelete])

  const handleDelete = (id: string) => {
    setDietToDelete(id)
  }

  const confirmDelete = async () => {
    if (!dietToDelete) return
    try {
      await dietsApi.delete(dietToDelete)
      setDiets((prev) => prev.filter((d) => d.id !== dietToDelete))
      toast({ title: 'Dieta eliminada' })
    } catch {
      toast({ title: 'Error al eliminar', variant: 'destructive' })
    } finally {
      setDietToDelete(null)
    }
  }

  const handleGenerateAi = async (clientId: string) => {
    setIsGeneratingAi((prev) => ({ ...prev, [clientId]: true }))
    toast({ title: 'Generando plan con IA...', description: 'Esto puede tardar unos segundos' })
    try {
      const newDiet = await dietsApi.generateAi(clientId)
      toast({ title: 'Plan generado con éxito', description: `Se ha creado y asignado: ${newDiet.title}` })
      setExpandedClientId(clientId)
      await load()
    } catch (err) {
      toast({
        title: 'Error al generar plan',
        description: err instanceof ApiError ? err.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingAi((prev) => ({ ...prev, [clientId]: false }))
    }
  }

  const openNewDiet = (clientId: string) => {
    setExpandedClientId(clientId)
    setEditingDiet(undefined)
    setEditorClientId(clientId)
  }

  const openEditDiet = (diet: Diet) => {
    setExpandedClientId(diet.userId)
    setEditingDiet(diet)
    setEditorClientId(diet.userId)
  }

  const closeEditor = () => {
    setEditorClientId(null)
    setEditingDiet(undefined)
  }

  const handleSaved = async () => {
    closeEditor()
    await load()
  }

  const filteredClients = clients.filter((c) => {
    const name  = `${c.firstName ?? ''} ${c.lastName ?? ''}`.toLowerCase()
    const email = c.email.toLowerCase()
    const query = search.toLowerCase()
    return name.includes(query) || email.includes(query)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Dietas</h1>
          <p className="text-muted-foreground">Pauta y administra los planes nutricionales de tus clientes</p>
        </div>
      </div>

      {/* Search */}
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
        <Card className="border border-white/40 bg-white/45 backdrop-blur-xl">
          <CardContent className="text-center py-10 text-muted-foreground">
            No se encontraron clientes
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredClients.map((client) => {
            const clientDiets  = diets.filter((d) => d.userId === client.id)
            const activeDiet   = clientDiets.find((d) => d.status === 'active')
            const archivedDiets = clientDiets.filter((d) => d.status === 'archived')
            const isExpanded   = expandedClientId === client.id
            const isEditing    = editorClientId === client.id
            const clientName   = `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() || client.email

            const clientQuestionnaire = questionnaires.find((q) => q.userId === client.id)
            const hasQuestionnaire = !!clientQuestionnaire

            return (
              <Card key={client.id} className="overflow-hidden shadow-sm border border-white/40 bg-white/45 backdrop-blur-xl">
                {/* Client row header */}
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
                    {activeDiet ? (
                      <Badge variant="success" className="text-[10px] gap-1 py-0.5 px-2 rounded-full font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Activa
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
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1"
                      onClick={() => openNewDiet(client.id)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Nueva Dieta
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

                {/* Expanded content */}
                {isExpanded && (
                  <CardContent className="p-5 border-t space-y-6">

                    {/* Editor */}
                    {isEditing && (
                      <div className="rounded-xl border-2 border-primary/30 bg-primary/[0.02] p-5 space-y-1">
                        <p className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                          <Pencil className="h-4 w-4" />
                          {editingDiet ? 'Editando dieta activa' : 'Nueva dieta para este cliente'}
                        </p>
                        <DietEditor
                          clientId={client.id}
                          existingDiet={editingDiet}
                          onSaved={handleSaved}
                          onCancel={closeEditor}
                        />
                      </div>
                    )}

                    {/* Active Diet View */}
                    {activeDiet && !isEditing && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              {activeDiet.title}
                            </h3>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(activeDiet.assignedAt)}
                              </span>
                              {(() => {
                                const avgCal = getDietAverageCalories(activeDiet.content, activeDiet.totalCalories)
                                if (avgCal > 0) {
                                  return (
                                    <span className="flex items-center gap-1">
                                      <Flame className="h-3 w-3 text-orange-500" />
                                      {avgCal} kcal
                                    </span>
                                  )
                                }
                                return null
                              })()}
                            </div>
                            {activeDiet.description && (
                              <p className="text-xs text-muted-foreground">{activeDiet.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1"
                              onClick={() => openEditDiet(activeDiet)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(activeDiet.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <DietTableReadOnly diet={activeDiet} />
                      </div>
                    )}

                    {/* No diet */}
                    {!activeDiet && !isEditing && (
                      <div className="text-center py-6 text-muted-foreground text-sm space-y-3">
                        <Utensils className="h-8 w-8 mx-auto opacity-30" />
                        <p>Este cliente no tiene ninguna dieta activa asignada.</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => openNewDiet(client.id)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Asignar primera dieta
                        </Button>
                      </div>
                    )}

                    {/* Archived diets */}
                    {archivedDiets.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Archive className="h-3.5 w-3.5" />
                          Historial archivado ({archivedDiets.length})
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {archivedDiets.map((d) => (
                            <div
                              key={d.id}
                              className="flex items-center justify-between p-3 rounded-lg border border-white/20 bg-white/20 backdrop-blur-md gap-2"
                            >
                              <div className="space-y-0.5 min-w-0">
                                <p className="text-xs font-semibold text-foreground/70 truncate">{d.title}</p>
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-2.5 w-2.5" />
                                  {formatDate(d.assignedAt)}
                                </p>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                onClick={() => handleDelete(d.id)}
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

      {/* Translucent Confirmation Modal */}
      {mounted && dietToDelete && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1E110A]/40 backdrop-blur-md animate-in fade-in duration-200 p-4">
          <div className="bg-white/80 border border-orange-100/40 shadow-2xl rounded-2xl max-w-sm w-full p-6 backdrop-blur-xl animate-in zoom-in-95 duration-200 space-y-4">
            <div className="space-y-2">
              <h3 className="text-base font-bold text-foreground">¿Eliminar esta dieta?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                ¿Estás seguro de que deseas eliminar este plan nutricional? Esta acción es irreversible y no se puede deshacer.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDietToDelete(null)}
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

export default function AdminDietasPage() {
  return (
    <Suspense fallback={<Loader label="Cargando..." />}>
      <AdminDietasContent />
    </Suspense>
  )
}
