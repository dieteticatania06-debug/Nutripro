'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { checkinsApi, progressApi, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { useClientDashboardStore } from '@/features/dashboard/store/dashboardStore'
import { Loader } from '@/components/ui/loader'
import {
  Apple, Flame, Utensils, Smile, Scale, PenTool,
  Clock, Moon, ShieldAlert, Dumbbell, Star,
  ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Option {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  isCustom?: boolean
}

interface Question {
  id: string
  label: string
  options: Option[]
  placeholder?: string
}

interface Step {
  id: string
  title: string
  description: string
  isRating?: boolean
  ratingLabel?: string
  question2?: Question
  question3?: Question
  isForm?: boolean
  fields?: { id: string; label: string; type: string; step?: string; placeholder?: string }[]
  isTextarea?: boolean
  placeholder?: string
}

const getISOWeekLabel = (date: Date): string => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const year = d.getUTCFullYear()
  const week = Math.ceil((((d.getTime() - Date.UTC(year, 0, 1)) / 86400000) + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

const steps: Step[] = [
  {
    id: 'dietAdherence',
    title: 'Adherencia a la Dieta',
    description: '¿Cómo calificarías tu adherencia general a tu plan de alimentación esta semana?',
    isRating: true,
    ratingLabel: 'Adherencia dieta',
    question2: {
      id: 'dietDifficulties',
      label: '¿Tuviste alguna dificultad para seguir el plan?',
      options: [
        { label: 'Ninguna (adherencia perfecta)', value: 'Ninguna (adherencia perfecta)', icon: Smile },
        { label: 'Los fines de semana', value: 'Los fines de semana', icon: Clock },
        { label: 'Las cenas / Por la noche', value: 'Las cenas / Por la noche', icon: Moon },
        { label: 'El picoteo entre horas', value: 'El picoteo entre horas', icon: ShieldAlert },
        { label: 'Otro / Especificar', value: '', icon: PenTool, isCustom: true },
      ],
      placeholder: 'Ej. Me costó adaptarme a los desayunos...'
    }
  },
  {
    id: 'energyLevel',
    title: 'Energía y Vitalidad',
    description: '¿Cómo han estado tus niveles de energía y vitalidad general durante esta semana?',
    isRating: true,
    ratingLabel: 'Nivel de energía',
    question2: {
      id: 'completedSessions',
      label: '¿Cuántas sesiones de entrenamiento completaste?',
      options: [
        { label: 'Todas las programadas (100%)', value: 'Todas las programadas', icon: Dumbbell },
        { label: 'La mayoría de ellas', value: 'La mayoría de ellas', icon: Clock },
        { label: 'Solo la mitad', value: 'Solo la mitad', icon: Clock },
        { label: 'Pocas o ninguna', value: 'Pocas o ninguna', icon: ShieldAlert },
      ]
    },
    question3: {
      id: 'trainingFeelings',
      label: '¿Cómo te sentiste físicamente entrenando?',
      options: [
        { label: 'Fuerte, con energía y motivado', value: 'Fuerte, con energía y motivado', icon: Flame },
        { label: 'Normal / Sin grandes cambios', value: 'Normal / Sin grandes cambios', icon: Smile },
        { label: 'Cansado, débil o fatigado', value: 'Cansado, débil o fatigado', icon: Moon },
        { label: 'Con molestias o dolores', value: 'Con molestias o dolores', icon: ShieldAlert },
      ]
    }
  },
  {
    id: 'hungerLevel',
    title: 'Control del Hambre',
    description: '¿Cómo calificarías tu nivel de hambre o antojos esta semana? (1 = Sin hambre, 5 = Mucha hambre)',
    isRating: true,
    ratingLabel: 'Nivel de hambre',
    question2: {
      id: 'digestiveIssues',
      label: '¿Has experimentado problemas digestivos?',
      options: [
        { label: 'Ninguno (buenas digestiones)', value: 'Ninguno (buenas digestiones)', icon: Smile },
        { label: 'Pesadez / Gases', value: 'Pesadez / Gases', icon: ShieldAlert },
        { label: 'Hinchazón abdominal', value: 'Hinchazón abdominal', icon: ShieldAlert },
        { label: 'Estreñimiento', value: 'Estreñimiento', icon: Clock },
        { label: 'Otro / Especificar', value: '', icon: PenTool, isCustom: true },
      ],
      placeholder: 'Ej. Sensación de acidez después de comer legumbres...'
    }
  },
  {
    id: 'mood',
    title: 'Estado de Ánimo y Descanso',
    description: '¿Cómo calificarías tu estado de ánimo y bienestar emocional general esta semana?',
    isRating: true,
    ratingLabel: 'Estado de ánimo',
    question2: {
      id: 'sleepQuality',
      label: '¿Cómo valoras la calidad de tu sueño y descanso?',
      options: [
        { label: 'Excelente (sueño reparador)', value: 'Excelente (sueño reparador)', icon: Moon },
        { label: 'Regular / Interrumpido', value: 'Regular / Interrumpido', icon: Clock },
        { label: 'Malo (insomnio / me cuesta dormir)', value: 'Malo (insomnio / me cuesta dormir)', icon: ShieldAlert },
        { label: 'Pocas horas de sueño', value: 'Pocas horas de sueño', icon: Clock },
      ]
    }
  },
  {
    id: 'bodySensations',
    title: 'Sensación Corporal y Ropa',
    description: '¿Cómo has notado tu cuerpo y el ajuste de tu ropa durante esta semana?',
    question2: {
      id: 'bodySensationsValue',
      label: 'Elige la opción que mejor describa tu semana:',
      options: [
        { label: 'Más deshinchado y ropa más suelta o cómoda', value: 'Más deshinchado / ropa holgada', icon: Smile },
        { label: 'Sin cambios notables a nivel visual o de ropa', value: 'Sin cambios notables', icon: Clock },
        { label: 'Me noto más hinchado o con retención de líquidos', value: 'Más hinchado / retención de líquidos', icon: ShieldAlert },
        { label: 'Me veo con más tono muscular y más fuerte', value: 'Me veo con más tono muscular y fuerte', icon: Flame },
      ]
    }
  },
  {
    id: 'notes',
    title: 'Comentarios Adicionales',
    description: 'Escribe cualquier observación relevante para tu nutricionista (ej: viajes, compromisos sociales, antojos, dudas).',
    isTextarea: true,
    placeholder: 'Escribe aquí lo que desees comentar...'
  }
]

export default function CheckinPage() {
  const router = useRouter()
  const { weeklyCheckins, reloadCheckins, reloadProgress } = useClientDashboardStore()
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  
  // Rating values
  const [dietRating, setDietRating] = useState(0)
  const [energyRating, setEnergyRating] = useState(0)
  const [hungerRating, setHungerRating] = useState(0)
  const [moodRating, setMoodRating] = useState(0)

  // Selection indexes
  const [selectedOpt2Index, setSelectedOpt2Index] = useState<number | null>(null)
  const [selectedOpt3Index, setSelectedOpt3Index] = useState<number | null>(null)
  const [customText, setCustomText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  const currentWeek = useMemo(() => getISOWeekLabel(new Date()), [])
  const existingCheckin = useMemo(() => weeklyCheckins.find(c => c.weekLabel === currentWeek), [weeklyCheckins, currentWeek])

  const step = steps[currentStep]
  const isLast = currentStep === steps.length - 1
  const progress = ((currentStep + 1) / steps.length) * 100

  useEffect(() => {
    // Check if checkins are loaded
    if (weeklyCheckins) {
      if (existingCheckin) {
        setSubmitted(true)
      }
      setIsInitialLoading(false)
    }
  }, [weeklyCheckins, existingCheckin])

  const handleSelectOpt2 = (index: number, option: Option) => {
    setSelectedOpt2Index(index)
    const q2Id = step.question2?.id
    if (!q2Id) return

    if (!option.isCustom) {
      setAnswers((prev) => ({ ...prev, [q2Id]: option.value }))
      setCustomText('')
    } else {
      setAnswers((prev) => ({ ...prev, [q2Id]: customText ? `Otro: ${customText}` : '' }))
    }
  }

  const handleSelectOpt3 = (index: number, option: Option) => {
    setSelectedOpt3Index(index)
    const q3Id = step.question3?.id
    if (!q3Id) return
    setAnswers((prev) => ({ ...prev, [q3Id]: option.value }))
  }

  const handleCustomTextChange = (text: string) => {
    setCustomText(text)
    const q2Id = step.question2?.id
    if (!q2Id) return
    setAnswers((prev) => ({ ...prev, [q2Id]: text ? `Otro: ${text}` : '' }))
  }

  const handleNext = () => {
    // Validations per step
    if (step.id === 'dietAdherence') {
      if (dietRating === 0) {
        toast({ title: 'Adherencia obligatoria', description: 'Por favor, selecciona una puntuación de estrellas.', variant: 'destructive' })
        return
      }
      if (!answers['dietDifficulties']) {
        toast({ title: 'Respuesta requerida', description: 'Por favor, indica si tuviste dificultades esta semana.', variant: 'destructive' })
        return
      }
    } else if (step.id === 'energyLevel') {
      if (energyRating === 0) {
        toast({ title: 'Energía obligatoria', description: 'Por favor, selecciona una puntuación de estrellas.', variant: 'destructive' })
        return
      }
      if (!answers['completedSessions'] || !answers['trainingFeelings']) {
        toast({ title: 'Respuestas requeridas', description: 'Por favor, completa las preguntas de entrenamiento.', variant: 'destructive' })
        return
      }
    } else if (step.id === 'hungerLevel') {
      if (hungerRating === 0) {
        toast({ title: 'Hambre obligatoria', description: 'Por favor, selecciona una puntuación de estrellas.', variant: 'destructive' })
        return
      }
      if (!answers['digestiveIssues']) {
        toast({ title: 'Respuesta requerida', description: 'Por favor, indica si tuviste problemas digestivos.', variant: 'destructive' })
        return
      }
    } else if (step.id === 'mood') {
      if (moodRating === 0) {
        toast({ title: 'Ánimo obligatorio', description: 'Por favor, selecciona una puntuación de estrellas.', variant: 'destructive' })
        return
      }
      if (!answers['sleepQuality']) {
        toast({ title: 'Respuesta requerida', description: 'Por favor, indica cómo dormiste esta semana.', variant: 'destructive' })
        return
      }
    } else if (step.id === 'bodySensations') {
      if (!answers['bodySensationsValue']) {
        toast({ title: 'Respuesta requerida', description: 'Por favor, selecciona cómo has sentido tu cuerpo esta semana.', variant: 'destructive' })
        return
      }
    }

    if (isLast) {
      handleSubmit()
    } else {
      setCurrentStep((prev) => {
        const nextStepIndex = prev + 1
        const nextStep = steps[nextStepIndex]
        
        // Restore step ratings / selections
        setSelectedOpt2Index(null)
        setSelectedOpt3Index(null)
        setCustomText('')

        const q2Id = nextStep.question2?.id
        const q3Id = nextStep.question3?.id

        if (q2Id && answers[q2Id]) {
          const ans = answers[q2Id]
          if (ans.startsWith('Otro: ')) {
            setCustomText(ans.replace('Otro: ', ''))
            const customIdx = nextStep.question2?.options.findIndex(o => o.isCustom) ?? -1
            setSelectedOpt2Index(customIdx !== -1 ? customIdx : null)
          } else {
            const idx = nextStep.question2?.options.findIndex(o => o.value === ans) ?? -1
            setSelectedOpt2Index(idx !== -1 ? idx : null)
          }
        }

        if (q3Id && answers[q3Id]) {
          const ans = answers[q3Id]
          const idx = nextStep.question3?.options.findIndex(o => o.value === ans) ?? -1
          setSelectedOpt3Index(idx !== -1 ? idx : null)
        }

        return nextStepIndex
      })
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => {
        const prevStepIndex = prev - 1
        const prevStep = steps[prevStepIndex]

        setSelectedOpt2Index(null)
        setSelectedOpt3Index(null)
        setCustomText('')

        const q2Id = prevStep.question2?.id
        const q3Id = prevStep.question3?.id

        if (q2Id && answers[q2Id]) {
          const ans = answers[q2Id]
          if (ans.startsWith('Otro: ')) {
            setCustomText(ans.replace('Otro: ', ''))
            const customIdx = prevStep.question2?.options.findIndex(o => o.isCustom) ?? -1
            setSelectedOpt2Index(customIdx !== -1 ? customIdx : null)
          } else {
            const idx = prevStep.question2?.options.findIndex(o => o.value === ans) ?? -1
            setSelectedOpt2Index(idx !== -1 ? idx : null)
          }
        }

        if (q3Id && answers[q3Id]) {
          const ans = answers[q3Id]
          const idx = prevStep.question3?.options.findIndex(o => o.value === ans) ?? -1
          setSelectedOpt3Index(idx !== -1 ? idx : null)
        }

        return prevStepIndex
      })
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // 1. Pack secondary questions into check-in notes
      const packedNotes = [
        answers['dietDifficulties'] ? `Dificultades Dieta: ${answers['dietDifficulties']}` : null,
        answers['completedSessions'] ? `Sesiones Completadas: ${answers['completedSessions']}` : null,
        answers['trainingFeelings'] ? `Sensación Entrenamiento: ${answers['trainingFeelings']}` : null,
        answers['digestiveIssues'] ? `Problemas Digestivos: ${answers['digestiveIssues']}` : null,
        answers['sleepQuality'] ? `Calidad de Sueño: ${answers['sleepQuality']}` : null,
        answers['bodySensationsValue'] ? `Sensación Corporal/Ropa: ${answers['bodySensationsValue']}` : null,
        answers['customNotes'] ? `Comentarios del cliente: ${answers['customNotes']}` : null,
      ].filter(Boolean).join(' | ')

      // 3. Save weekly check-in
      await checkinsApi.create({
        weekLabel: currentWeek,
        dietAdherence: dietRating,
        energyLevel: energyRating,
        hungerLevel: hungerRating,
        mood: moodRating,
        notes: packedNotes || null,
      })

      toast({ title: '¡Check-in completado!', description: 'Tus datos semanales han sido enviados a tu nutricionista.' })
      setSubmitted(true)
      await reloadCheckins()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof ApiError ? err.message : 'Error al guardar el check-in.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isInitialLoading) {
    return <Loader label="Cargando check-in..." />
  }

  if (submitted) {
    const details = existingCheckin ?? { dietAdherence: dietRating, energyLevel: energyRating, hungerLevel: hungerRating, mood: moodRating, notes: '' }
    return (
      <div className="max-w-4xl mx-auto space-y-8 py-4 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Check-in Semanal</h1>
          <p className="text-muted-foreground">
            Has enviado tu informe de seguimiento para esta semana.
          </p>
        </div>

        <Card className="shadow-md border-white/40 overflow-hidden bg-white/45 backdrop-blur-xl">
          <CardHeader className="bg-gradient-to-r from-teal-500/5 to-transparent pb-6 border-b">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
              Check-in de la semana {currentWeek}
            </CardTitle>
            <CardDescription className="text-xs">
              Tu nutricionista analizará tu progreso para ajustar tu plan clínico y alimentario.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Adherencia Dieta', val: `${details.dietAdherence}/5`, icon: Apple, color: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/20' },
                { label: 'Nivel de Energía', val: `${details.energyLevel}/5`, icon: Flame, color: 'text-amber-500 bg-amber-500/5 border-amber-500/20' },
                { label: 'Hambre / Ansiedad', val: details.hungerLevel ? `${details.hungerLevel}/5` : 'No indicado', icon: Utensils, color: 'text-orange-500 bg-orange-500/5 border-orange-500/20' },
                { label: 'Estado de Ánimo', val: details.mood ? `${details.mood}/5` : 'No indicado', icon: Smile, color: 'text-purple-500 bg-purple-500/5 border-purple-500/20' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="p-4 rounded-xl border border-muted/70 bg-card flex flex-col gap-2 shadow-sm text-center items-center">
                    <div className={cn("p-2 rounded-full", item.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{item.label}</span>
                    <p className="text-lg font-black text-foreground">{item.val}</p>
                  </div>
                )
              })}
            </div>

            {details.notes && (
              <div className="p-4 rounded-xl border border-muted/70 bg-card shadow-sm space-y-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Información adicional reportada</span>
                <p className="text-sm font-semibold text-foreground/80 leading-relaxed whitespace-pre-line">
                  {details.notes.split(' | ').join('\n')}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-muted">
              <Button onClick={() => router.push('/dashboard')} className="font-bold shadow">
                Volver al Panel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-teal-600" />
          Check-in Semanal
        </h1>
        <p className="text-muted-foreground">
          Completa el seguimiento semanal para evaluar tus métricas y poder optimizar tu plan nutricional.
        </p>
      </div>

      {/* Progress Tracker */}
      <div className="space-y-2.5">
        <div className="flex justify-between text-xs font-semibold text-muted-foreground">
          <span>PREGUNTA {currentStep + 1} DE {steps.length}</span>
          <span className="text-teal-600">{Math.round(progress)}% COMPLETADO</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-600 transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <Card className="shadow-md border-white/40 overflow-hidden bg-white/45 backdrop-blur-xl">
        <CardHeader className="bg-gradient-to-r from-teal-500/5 to-transparent pb-6 border-b">
          <CardTitle className="text-lg font-bold">{step.title}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">{step.description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* 1. Rating Stars if step isRating */}
          {step.isRating && (
            <div className="space-y-2 border-b border-muted/50 pb-4">
              <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wider block">
                Valoración en escala del 1 al 5
              </Label>
              <div className="flex gap-2.5 py-1 justify-center md:justify-start">
                {[1, 2, 3, 4, 5].map((starIdx) => {
                  const val = starIdx
                  const currentRating = step.id === 'dietAdherence' ? dietRating
                    : step.id === 'energyLevel' ? energyRating
                    : step.id === 'hungerLevel' ? hungerRating
                    : moodRating

                  const isFilled = val <= currentRating
                  const setRating = step.id === 'dietAdherence' ? setDietRating
                    : step.id === 'energyLevel' ? setEnergyRating
                    : step.id === 'hungerLevel' ? setHungerRating
                    : setMoodRating

                  return (
                    <button
                      key={starIdx}
                      type="button"
                      onClick={() => setRating(val)}
                      className="p-1 cursor-pointer bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none transition-all duration-150 active:scale-95"
                    >
                      <Star
                        className={cn(
                          "w-8 h-8 transition-all duration-150",
                          isFilled
                            ? "fill-amber-400 text-amber-400 scale-110"
                            : "text-muted-foreground/30 hover:text-amber-400/50"
                        )}
                      />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 2. Secondary Question Options */}
          {step.question2 && (
            <div className="space-y-3">
              <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wider block">
                {step.question2.label}
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {step.question2?.options.map((opt, idx) => {
                  const isSelected = selectedOpt2Index === idx
                  const Icon = opt.icon
                  return (
                    <div
                      key={opt.label}
                      onClick={() => handleSelectOpt2(idx, opt)}
                      className={cn(
                        "flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer select-none group",
                        isSelected
                          ? "border-teal-600 bg-teal-50/20 shadow-sm ring-1 ring-teal-600"
                          : "border-muted hover:border-teal-500/40 hover:bg-muted/30"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-lg transition-colors",
                        isSelected
                          ? "bg-teal-600 text-white"
                          : "bg-muted text-muted-foreground group-hover:text-teal-600 group-hover:bg-teal-600/10"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={cn(
                        "text-xs font-bold transition-colors",
                        isSelected ? "text-teal-950 font-extrabold" : "text-foreground/90"
                      )}>
                        {opt.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 3. Conditional Custom Text for Question 2 */}
          {selectedOpt2Index !== null && step.question2?.options[selectedOpt2Index]?.isCustom && (
            <div className="space-y-2 pt-1 animate-in fade-in slide-in-from-top-4 duration-200">
              <Label htmlFor="custom-text" className="text-xs font-bold text-teal-600">
                Especifica los detalles
              </Label>
              <Textarea
                id="custom-text"
                rows={3}
                placeholder={step.question2.placeholder || 'Escribe aquí tu respuesta...'}
                value={customText}
                onChange={(e) => handleCustomTextChange(e.target.value)}
                className="w-full text-xs rounded-xl"
                autoFocus
              />
            </div>
          )}

          {/* 4. Tertiary Question Options */}
          {step.question3 && (
            <div className="space-y-3 pt-3 border-t border-muted/50">
              <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wider block">
                {step.question3.label}
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {step.question3?.options.map((opt, idx) => {
                  const isSelected = selectedOpt3Index === idx
                  const Icon = opt.icon
                  return (
                    <div
                      key={opt.label}
                      onClick={() => handleSelectOpt3(idx, opt)}
                      className={cn(
                        "flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer select-none group",
                        isSelected
                          ? "border-teal-600 bg-teal-50/20 shadow-sm ring-1 ring-teal-600"
                          : "border-muted hover:border-teal-500/40 hover:bg-muted/30"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-lg transition-colors",
                        isSelected
                          ? "bg-teal-600 text-white"
                          : "bg-muted text-muted-foreground group-hover:text-teal-600 group-hover:bg-teal-600/10"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={cn(
                        "text-xs font-bold transition-colors",
                        isSelected ? "text-teal-950 font-extrabold" : "text-foreground/90"
                      )}>
                        {opt.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 5. Physical stats input fields */}
          {step.isForm && step.fields && (
            <div className="space-y-4 max-w-sm mx-auto py-2 text-left">
              {step.fields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <Label htmlFor={field.id} className="text-xs font-bold text-foreground/85 uppercase tracking-wider">
                    {field.label}
                  </Label>
                  <Input
                    id={field.id}
                    type={field.type}
                    step={field.step}
                    placeholder={field.placeholder}
                    value={answers[field.id] || ''}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="rounded-full bg-white/70 focus:bg-white text-xs h-10 border-orange-100/70 focus:ring-teal-600/25"
                  />
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground text-center pt-2 font-medium leading-relaxed">
                Estos datos se guardarán automáticamente en tu historial de progreso físico para trazar tus gráficas de evolución.
              </p>
            </div>
          )}

          {/* 6. General comments textarea */}
          {step.isTextarea && (
            <div className="space-y-2 max-w-lg mx-auto pt-2 text-left">
              <Label htmlFor="custom-notes" className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
                Escribe tus notas
              </Label>
              <Textarea
                id="custom-notes"
                rows={5}
                placeholder={step.placeholder}
                value={answers['customNotes'] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, customNotes: e.target.value }))}
                className="w-full text-xs rounded-2xl resize-none p-3.5 focus:ring-teal-600/25"
              />
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex justify-between items-center pt-4 border-t border-muted mt-6">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="px-4 gap-2 text-sm font-semibold rounded-full h-9"
              >
                <ArrowLeft className="w-4 h-4" /> Anterior
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push('/dashboard')}
                className="px-4 text-sm font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full h-9"
              >
                Cancelar
              </Button>
            </div>
            <Button
              onClick={handleNext}
              disabled={isSubmitting}
              className="px-6 gap-2 text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-full h-9 shadow shadow-teal-900/10"
            >
              {isSubmitting ? (
                'Guardando...'
              ) : isLast ? (
                <>
                  Enviar Check-in <CheckCircle2 className="w-4 h-4" />
                </>
              ) : (
                <>
                  Siguiente <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
