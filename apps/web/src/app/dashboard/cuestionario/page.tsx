'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { questionnairesApi, profileApi, ApiError } from '@/lib/api'
import { parseObservations } from '@nutripro/shared'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import {
  TrendingDown, Dumbbell, Heart, PenTool,
  Apple, Clock, Utensils, Moon,
  Sparkles, Coffee, Crop, Leaf,
  Briefcase, GraduationCap, Home,
  Smile, Activity, Flame,
  Check, HeartPulse, Baby, Calendar,
  ArrowLeft, ArrowRight, CheckCircle2,
  Droplet, ShieldAlert, Sparkle
} from 'lucide-react'

interface Option {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  isCustom?: boolean
}

interface Step {
  id: string
  title: string
  description: string
  options: Option[]
  placeholder?: string
}

const steps: Step[] = [
  {
    id: 'objectives',
    title: 'Objetivo Principal',
    description: '¿Cuál es tu meta principal con NutriPro?',
    options: [
      { label: 'Perder Peso', value: 'Perder peso', icon: TrendingDown },
      { label: 'Ganar Masa Muscular', value: 'Ganar masa muscular', icon: Dumbbell },
      { label: 'Mantener Peso y Estar Saludable', value: 'Mantener peso y estar saludable', icon: Heart },
      { label: 'Otro / Especificar', value: '', icon: PenTool, isCustom: true },
    ],
    placeholder: 'Ej: Mejorar mi energía para correr maratones...'
  },
  {
    id: 'physical',
    title: 'Datos Físicos',
    description: 'Indica tu fecha de nacimiento, sexo, altura y peso actual para estimar tus necesidades energéticas.',
    options: []
  },
  {
    id: 'eatingHabits',
    title: 'Hábitos Alimenticios',
    description: '¿Cómo clasificarías tu alimentación actual?',
    options: [
      { label: 'Saludable y Equilibrada', value: 'Alimentación saludable y equilibrada', icon: Apple },
      { label: 'Suelo Saltarme Comidas', value: 'Desorden alimentario / Suelo saltarme comidas', icon: Clock },
      { label: 'Como Fuera de Casa Frecuentemente', value: 'Como mucho fuera de casa / Comida rápida', icon: Utensils },
      { label: 'Suelo comer alimento ultraprocesado', value: 'Suelo comer alimentos ultraprocesados recurrentemente', icon: Moon },
      { label: 'Otro / Especificar', value: '', icon: PenTool, isCustom: true },
    ],
    placeholder: 'Ej: Como sano de lunes a viernes pero los findes bebo cerveza...'
  },
  {
    id: 'restrictions',
    title: 'Restricciones y Alergias',
    description: '¿Tienes alguna alergia, intolerancia o preferencia?',
    options: [
      { label: 'Sin Restricciones (como de todo)', value: 'Sin restricciones (como de todo)', icon: Sparkles },
      { label: 'Intolerancia a la Lactosa', value: 'Intolerancia a la lactosa / Sin lácteos', icon: Coffee },
      { label: 'Celíaco / Sin Gluten', value: 'Celíaco / Intolerancia al gluten', icon: Crop },
      { label: 'Vegetariano / Vegano', value: 'Vegetariano / Vegano', icon: Leaf },
      { label: 'Otro / Especificar', value: '', icon: PenTool, isCustom: true },
    ],
    placeholder: 'Ej: Alérgico a los cacahuetes y marisco...'
  },
  {
    id: 'schedule',
    title: 'Horario Diario',
    description: '¿Cuál es tu tipo de jornada habitual?',
    options: [
      { label: 'Oficina / Horario Fijo', value: 'Horario de oficina regular (9 a 18h)', icon: Briefcase },
      { label: 'Turnos / Rotativo / Nocturno', value: 'Trabajo por turnos / rotativo / nocturno', icon: Clock },
      { label: 'Estudiante / Muy Flexible', value: 'Estudiante / Horarios muy flexibles', icon: GraduationCap },
      { label: 'Teletrabajo / Sedentario', value: 'Teletrabajo / Trabajo desde casa', icon: Home },
      { label: 'Otro / Especificar', value: '', icon: PenTool, isCustom: true },
    ],
    placeholder: 'Ej: Trabajo de enfermera en turnos rotativos de 12 horas...'
  },
  {
    id: 'sportsExperience',
    title: 'Actividad Física',
    description: '¿Con qué frecuencia haces deporte?',
    options: [
      { label: 'Sedentario (No hago ejercicio)', value: 'Sedentario (no hago ejercicio)', icon: Smile },
      { label: 'Ocasional (1-2 veces por semana)', value: 'Ocasional (1-2 veces por semana)', icon: Activity },
      { label: 'Activo (3-4 veces por semana)', value: 'Activo (3-4 veces por semana)', icon: Dumbbell },
      { label: 'Muy Activo (5+ veces por semana)', value: 'Muy activo / Atleta (5+ veces por semana)', icon: Flame },
      { label: 'Otro / Especificar', value: '', icon: PenTool, isCustom: true },
    ],
    placeholder: 'Ej: Hago crossfit y salgo a caminar...'
  },
  {
    id: 'trainingLevel',
    title: 'Nivel de Entrenamiento de Fuerza',
    description: '¿Cuál es tu nivel de experiencia entrenando con cargas (pesas o calistenia)?',
    options: [
      { label: 'Nunca he entrenado (Principiante absoluto)', value: 'Principiante absoluto (nunca entrenado)', icon: Smile },
      { label: 'Principiante (Menos de 6 meses)', value: 'Principiante (llevo poco)', icon: Activity },
      { label: 'Intermedio (Entre 6 meses y 2 años)', value: 'Intermedio (ya entrenado)', icon: Dumbbell },
      { label: 'Avanzado (Más de 2 años entrenando)', value: 'Avanzado (experto)', icon: Flame },
      { label: 'Otro / Especificar', value: '', icon: PenTool, isCustom: true },
    ],
    placeholder: 'Ej: He hecho entrenamiento funcional pero nunca pesas libres...'
  },
  {
    id: 'trainingDays',
    title: 'Días de Entrenamiento',
    description: '¿Cuántos días a la semana puedes entrenar?',
    options: [
      { label: '1 - 2 días a la semana', value: '1-2 días', icon: Calendar },
      { label: '3 - 4 días a la semana', value: '3-4 días', icon: Calendar },
      { label: '5 o más días a la semana', value: '5+ días', icon: Calendar },
      { label: 'Otro / Especificar', value: '', icon: PenTool, isCustom: true },
    ],
    placeholder: 'Ej: Puedo entrenar de lunes a viernes...'
  },
  {
    id: 'trainingDuration',
    title: 'Duración del Entrenamiento',
    description: '¿De cuánto tiempo dispones por sesión de entrenamiento?',
    options: [
      { label: '30 a 45 minutos', value: '30-45 minutos', icon: Clock },
      { label: '1 hora', value: '1 hora', icon: Clock },
      { label: '1.5 a 2 horas', value: '1.5-2 horas', icon: Clock },
      { label: 'Otro / Especificar', value: '', icon: PenTool, isCustom: true },
    ],
    placeholder: 'Ej: Los lunes tengo 2 horas pero el resto de días solo 45 min...'
  },
  {
    id: 'trainingLocation',
    title: 'Lugar de Entrenamiento',
    description: '¿Dónde prefieres realizar tu rutina de ejercicio?',
    options: [
      { label: 'En Casa', value: 'En casa', icon: Home },
      { label: 'En el Gimnasio', value: 'En el gimnasio', icon: Dumbbell },
      { label: 'Al aire libre / Otro', value: '', icon: PenTool, isCustom: true },
    ],
    placeholder: 'Ej: Entreno en el parque de mi barrio...'
  },
  {
    id: 'hydration',
    title: 'Hidratación Diaria',
    description: '¿Cuánta agua bebes habitualmente al día?',
    options: [
      { label: 'Menos de 1 Litro', value: 'Menos de 1 litro al día', icon: Droplet },
      { label: 'Entre 1 y 2 Litros', value: 'Entre 1 y 2 litros al día', icon: Droplet },
      { label: 'Más de 2 Litros', value: 'Más de 2 litros al día (buena hidratación)', icon: Droplet },
      { label: 'No suelo llevar la cuenta', value: 'No suelo llevar la cuenta del agua que bebo', icon: Droplet },
    ]
  },
  {
    id: 'sleepStress',
    title: 'Descanso y Estrés',
    description: '¿Cómo evalúas tu descanso y nivel de estrés diario?',
    options: [
      { label: 'Duermo bien y tengo poco estrés', value: 'Duermo bien y tengo poco estrés', icon: Heart },
      { label: 'Suelo dormir mal / Insomnio', value: 'Suelo dormir mal o tengo insomnio', icon: Moon },
      { label: 'Nivel de estrés alto', value: 'Tengo un nivel de estrés diario alto', icon: ShieldAlert },
    ]
  },
  {
    id: 'mealFrequency',
    title: 'Frecuencia de Comidas',
    description: '¿Cuántas comidas sueles realizar a lo largo del día?',
    options: [
      { label: '2 a 3 comidas al día', value: 'Realizo 2-3 comidas al día', icon: Utensils },
      { label: '4 comidas al día', value: 'Realizo 4 comidas al día', icon: Utensils },
      { label: '5 o más comidas al día', value: 'Realizo 5 o más comidas al día', icon: Utensils },
      { label: 'No tengo una preferencia fija', value: 'No tengo preferencia fija', icon: Sparkle },
    ]
  },
  {
    id: 'supplements',
    title: 'Suplementación y Medicamentos',
    description: '¿Tomas actualmente algún tipo de suplemento deportivo o medicación?',
    options: [
      { label: 'No tomo nada', value: 'No tomo suplementos ni medicación diaria', icon: Check },
      { label: 'Tengo suplementos / Medicación (especificar)', value: '', icon: HeartPulse, isCustom: true },
    ],
    placeholder: 'Ej: Tomo levotiroxina en ayunas, batido de proteína de suero y creatina...'
  },
  {
    id: 'barriers',
    title: 'Dificultades y Barreras',
    description: '¿Cuál ha sido tu principal dificultad al intentar seguir planes de alimentación en el pasado?',
    options: [
      { label: 'Ansiedad por la comida / Picoteo', value: 'Ansiedad por la comida / picoteo entre horas', icon: ShieldAlert },
      { label: 'Falta de tiempo para cocinar', value: 'Falta de tiempo para cocinar y planificar', icon: Clock },
      { label: 'Dietas aburridas o muy estrictas', value: 'Me aburro rápido o las dietas son demasiado estrictas', icon: TrendingDown },
      { label: 'Falta de motivación o constancia', value: 'Falta de motivación o constancia a medio plazo', icon: Activity },
      { label: 'Nunca antes realicé una dieta', value: 'Nunca antes realicé una dieta', icon: Smile },
      { label: 'Otro / Especificar', value: '', icon: PenTool, isCustom: true },
    ],
    placeholder: 'Ej: Me cuesta mucho mantener los fines de semana la rutina sana...'
  },
  {
    id: 'observations',
    title: 'Observaciones Médicas',
    description: '¿Hay alguna condición médica relevante que debamos saber?',
    options: [
      { label: 'Ninguna Observación', value: 'Ninguna observación relevante', icon: Check },
      { label: 'Tengo Condición Médica (Diabetes, etc.)', value: '', icon: HeartPulse, isCustom: true },
      { label: 'Embarazo / Lactancia', value: 'Embarazo / Lactancia', icon: Baby },
      { label: 'Tomo Medicación Diaria', value: 'Tomo medicación diaria', icon: Calendar },
      { label: 'Otro / Especificar', value: '', icon: PenTool, isCustom: true },
    ],
    placeholder: 'Ej: Diabetes tipo 1, hipertensión controlada...'
  },
]

const calculateAge = (birthDateStr: string): number | null => {
  if (!birthDateStr) return null
  const birthDate = new Date(birthDateStr)
  if (isNaN(birthDate.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}



import { useClientDashboardStore } from '@/features/dashboard/store/dashboardStore'
import { Loader } from '@/components/ui/loader'

export default function CuestionarioPage() {
  const router = useRouter()
  const { questionnaires: storeQuestionnaires, profile, isLoaded, reloadQuestionnaires, fetchData } = useClientDashboardStore()
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null)
  const [customText, setCustomText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(!isLoaded)
  const [existingQuestionnaire, setExistingQuestionnaire] = useState<any | null>(null)

  const step = steps[currentStep]
  const isLast = currentStep === steps.length - 1
  const progress = ((currentStep + 1) / steps.length) * 100

  useEffect(() => {
    if (isLoaded) {
      const list = storeQuestionnaires
      if (list && list.length > 0) {
        setExistingQuestionnaire(list[0])
        const isEditing = localStorage.getItem('nutripro_questionnaire_editing') === 'true'
        if (!isEditing) {
          setSubmitted(true)
        } else {
          // Prefill answers
          const parsedObs = parseObservations(list[0].observations)
          const prefilled: Record<string, string> = {
            objectives: list[0].objectives ?? '',
            eatingHabits: list[0].eatingHabits ?? '',
            restrictions: list[0].restrictions ?? '',
            schedule: list[0].schedule ?? '',
            sportsExperience: list[0].sportsExperience ?? '',
            trainingLevel: parsedObs.trainingLevel || '',
            hydration: parsedObs.hydration || '',
            sleepStress: parsedObs.sleepStress || '',
            mealFrequency: parsedObs.mealFrequency || '',
            supplements: parsedObs.supplements || '',
            barriers: parsedObs.barriers || '',
            age: parsedObs.age || '',
            height: parsedObs.height || '',
            weight: parsedObs.weight || '',
            birthDate: parsedObs.birthDate || '',
            gender: parsedObs.gender || '',
            trainingDays: parsedObs.trainingDays || '',
            trainingDuration: parsedObs.trainingDuration || '',
            trainingLocation: parsedObs.trainingLocation || '',
            observations: parsedObs.observations || ((list[0].observations && !list[0].observations.includes(' | ')) ? list[0].observations : ''),
          }
          setAnswers(prefilled)
          setSubmitted(false)
        }
      }
      setIsInitialLoading(false)
    }
  }, [isLoaded, storeQuestionnaires])

  const handleSelectOption = (index: number, option: Option) => {
    setSelectedOptionIndex(index)
    if (!option.isCustom) {
      setAnswers((prev) => ({ ...prev, [step.id]: option.value }))
      setCustomText('')
    } else {
      setAnswers((prev) => ({ ...prev, [step.id]: customText ? `Otro: ${customText}` : '' }))
    }
  }

  const handleCustomTextChange = (text: string) => {
    setCustomText(text)
    setAnswers((prev) => ({ ...prev, [step.id]: text ? `Otro: ${text}` : '' }))
  }

  const handleNext = () => {
    if (step.id === 'physical') {
      const birthDate = answers['birthDate']
      const gender = answers['gender']
      const height = answers['height']
      const weight = answers['weight']
      if (!birthDate || !gender || !height || !weight || !birthDate.trim() || !gender.trim() || !height.trim() || !weight.trim()) {
        toast({
          title: 'Datos requeridos',
          description: 'Por favor, rellena todos los campos antes de continuar.',
          variant: 'destructive'
        })
        return
      }
    } else {
      const currentAnswer = answers[step.id]
      if (!currentAnswer || !currentAnswer.trim()) {
        toast({
          title: 'Selección requerida',
          description: 'Por favor selecciona una opción antes de continuar.',
          variant: 'destructive'
        })
        return
      }
    }

    if (isLast) {
      handleSubmit()
    } else {
      setCurrentStep((prev) => {
        const nextStepIndex = prev + 1
        const nextStepId = steps[nextStepIndex].id
        const existingAnswer = answers[nextStepId] || ''

        if (existingAnswer) {
          if (existingAnswer.startsWith('Otro: ')) {
            setCustomText(existingAnswer.replace('Otro: ', ''))
            const customOptIdx = steps[nextStepIndex].options.findIndex(o => o.isCustom)
            setSelectedOptionIndex(customOptIdx !== -1 ? customOptIdx : null)
          } else {
            setCustomText('')
            const optIdx = steps[nextStepIndex].options.findIndex(o => o.value === existingAnswer)
            setSelectedOptionIndex(optIdx !== -1 ? optIdx : null)
          }
        } else {
          setCustomText('')
          setSelectedOptionIndex(null)
        }
        return nextStepIndex
      })
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => {
        const prevStepIndex = prev - 1
        const prevStepId = steps[prevStepIndex].id
        const existingAnswer = answers[prevStepId] || ''

        if (existingAnswer) {
          if (existingAnswer.startsWith('Otro: ')) {
            setCustomText(existingAnswer.replace('Otro: ', ''))
            const customOptIdx = steps[prevStepIndex].options.findIndex(o => o.isCustom)
            setSelectedOptionIndex(customOptIdx !== -1 ? customOptIdx : null)
          } else {
            setCustomText('')
            const optIdx = steps[prevStepIndex].options.findIndex(o => o.value === existingAnswer)
            setSelectedOptionIndex(optIdx !== -1 ? optIdx : null)
          }
        } else {
          setCustomText('')
          setSelectedOptionIndex(null)
        }
        return prevStepIndex
      })
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Pack the additional questions safely into observations so we don't break existing schemas
      const packagedObservations = [
        answers['observations'] ? `Médico: ${answers['observations']}` : null,
        answers['hydration'] ? `Hidratación: ${answers['hydration']}` : null,
        answers['sleepStress'] ? `Sueño/Estrés: ${answers['sleepStress']}` : null,
        answers['mealFrequency'] ? `Frecuencia Comidas: ${answers['mealFrequency']}` : null,
        answers['supplements'] ? `Suplementación: ${answers['supplements']}` : null,
        answers['barriers'] ? `Barreras Anteriores: ${answers['barriers']}` : null,
        answers['age'] ? `Edad: ${answers['age']}` : null,
        answers['height'] ? `Altura: ${answers['height']}` : null,
        answers['weight'] ? `Peso: ${answers['weight']}` : null,
        answers['birthDate'] ? `Fecha Nacimiento: ${answers['birthDate']}` : null,
        answers['gender'] ? `Sexo: ${answers['gender']}` : null,
        answers['trainingLevel'] ? `Nivel Entrenamiento: ${answers['trainingLevel']}` : null,
        answers['trainingDays'] ? `Días Entrenamiento: ${answers['trainingDays']}` : null,
        answers['trainingDuration'] ? `Duración Entrenamiento: ${answers['trainingDuration']}` : null,
        answers['trainingLocation'] ? `Lugar Entrenamiento: ${answers['trainingLocation']}` : null,
      ].filter(Boolean).join(' | ')

      await questionnairesApi.create({
        objectives: answers['objectives'] ?? '',
        eatingHabits: answers['eatingHabits'] ?? '',
        restrictions: answers['restrictions'] ?? '',
        schedule: answers['schedule'] ?? '',
        sportsExperience: answers['sportsExperience'] ?? '',
        observations: packagedObservations || null,
      })

      // Auto-populate profile information
      if (profile) {
        await profileApi.update({
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
          birthDate: answers['birthDate'] || profile.birthDate,
          gender: (answers['gender'] as any) || profile.gender,
          height: answers['height'] ? parseFloat(answers['height']) : profile.height,
          weight: answers['weight'] ? parseFloat(answers['weight']) : profile.weight,
          goal: answers['objectives'] || profile.goal,
          allergies: answers['restrictions'] || profile.allergies,
          observations: profile.observations
        })
        // Fetch fresh client data to update store
        await fetchData(true)
      }

      localStorage.removeItem('nutripro_questionnaire_editing')
      setSubmitted(true)
      await reloadQuestionnaires()
      const list = useClientDashboardStore.getState().questionnaires
      if (list && list.length > 0) {
        setExistingQuestionnaire(list[0])
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof ApiError ? err.message : 'Error al enviar el cuestionario.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getDisplayValue = (key: string) => {
    const obsStr = existingQuestionnaire ? existingQuestionnaire.observations : answers['observations']
    const packedKeys = ['hydration', 'sleepStress', 'mealFrequency', 'supplements', 'barriers', 'observations', 'age', 'height', 'weight', 'birthDate', 'gender', 'trainingDays', 'trainingDuration', 'trainingLocation', 'trainingLevel']

    if (packedKeys.includes(key) && key !== 'observations') {
      const parsed = parseObservations(obsStr)
      const val = parsed[key as keyof typeof parsed] || answers[key]
      if (!val) return 'Ninguna'
      if (val.startsWith('Otro: ')) return val.replace('Otro: ', '')
      return val
    }

    let val = ''
    if (key === 'observations') {
      const parsed = parseObservations(obsStr)
      val = parsed.observations || (obsStr && !obsStr.includes(' | ') ? obsStr : '')
    } else {
      val = existingQuestionnaire ? existingQuestionnaire[key] : answers[key]
    }

    if (!val) return 'Ninguna'
    if (val.startsWith('Otro: ')) return val.replace('Otro: ', '')
    return val
  }

  if (isInitialLoading) {
    return <Loader label="Cargando cuestionario..." />
  }

  const handleUpdateQuestionnaire = () => {
    localStorage.setItem('nutripro_questionnaire_editing', 'true')
    if (existingQuestionnaire) {
      const parsedObs = parseObservations(existingQuestionnaire.observations)
      const prefilled: Record<string, string> = {
        objectives: existingQuestionnaire.objectives ?? '',
        eatingHabits: existingQuestionnaire.eatingHabits ?? '',
        restrictions: existingQuestionnaire.restrictions ?? '',
        schedule: existingQuestionnaire.schedule ?? '',
        sportsExperience: existingQuestionnaire.sportsExperience ?? '',
        trainingLevel: parsedObs.trainingLevel || '',
        hydration: parsedObs.hydration || '',
        sleepStress: parsedObs.sleepStress || '',
        mealFrequency: parsedObs.mealFrequency || '',
        supplements: parsedObs.supplements || '',
        barriers: parsedObs.barriers || '',
        age: parsedObs.age || '',
        height: parsedObs.height || '',
        weight: parsedObs.weight || '',
        birthDate: parsedObs.birthDate || '',
        gender: parsedObs.gender || '',
        trainingDays: parsedObs.trainingDays || '',
        trainingDuration: parsedObs.trainingDuration || '',
        trainingLocation: parsedObs.trainingLocation || '',
        observations: parsedObs.observations || (!existingQuestionnaire.observations?.includes(' | ') ? existingQuestionnaire.observations : ''),
      }
      setAnswers(prefilled)
    }
    setSubmitted(false)
    setCurrentStep(0)
    setSelectedOptionIndex(null)
    setCustomText('')
  }

  const handleCancel = () => {
    localStorage.removeItem('nutripro_questionnaire_editing')
    if (existingQuestionnaire) {
      const parsedObs = parseObservations(existingQuestionnaire.observations)
      const prefilled: Record<string, string> = {
        objectives: existingQuestionnaire.objectives ?? '',
        eatingHabits: existingQuestionnaire.eatingHabits ?? '',
        restrictions: existingQuestionnaire.restrictions ?? '',
        schedule: existingQuestionnaire.schedule ?? '',
        sportsExperience: existingQuestionnaire.sportsExperience ?? '',
        trainingLevel: parsedObs.trainingLevel || '',
        hydration: parsedObs.hydration || '',
        sleepStress: parsedObs.sleepStress || '',
        mealFrequency: parsedObs.mealFrequency || '',
        supplements: parsedObs.supplements || '',
        barriers: parsedObs.barriers || '',
        age: parsedObs.age || '',
        height: parsedObs.height || '',
        weight: parsedObs.weight || '',
        birthDate: parsedObs.birthDate || '',
        gender: parsedObs.gender || '',
        observations: parsedObs.observations || (!existingQuestionnaire.observations?.includes(' | ') ? existingQuestionnaire.observations : ''),
      }
      setAnswers(prefilled)
      setSubmitted(true)
      setCurrentStep(0)
      setSelectedOptionIndex(null)
      setCustomText('')
    } else {
      router.push('/dashboard')
    }
  }

  if (submitted) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 py-4 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Cuestionario Completado</h1>
            <p className="text-muted-foreground">
              Tu dietista ha recibido tus respuestas y ajustará tu plan a medida.
            </p>
          </div>
          <Button
            onClick={handleUpdateQuestionnaire}
            variant="outline"
            className="shrink-0 gap-2 font-semibold"
          >
            <PenTool className="w-4 h-4" />
            Actualizar Cuestionario
          </Button>
        </div>

        <Card className="shadow-md border-white/40 overflow-hidden bg-white/45 backdrop-blur-xl">
          <CardHeader className="bg-gradient-to-r from-emerald-500/5 to-transparent pb-6 border-b">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Resumen de tus Respuestas
            </CardTitle>
            <CardDescription className="text-xs">
              Última actualización: {existingQuestionnaire ? new Date(existingQuestionnaire.submittedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Ahora mismo'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4 bg-muted/5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Objetivo Principal', val: getDisplayValue('objectives'), icon: TrendingDown, color: 'text-blue-500 bg-blue-500/5 border-blue-500/20' },
                { label: 'Fecha de Nacimiento', val: getDisplayValue('birthDate'), icon: Calendar, color: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/20' },
                { label: 'Edad (años)', val: getDisplayValue('age'), icon: Calendar, color: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/20' },
                { label: 'Sexo', val: getDisplayValue('gender') === 'male' ? 'Hombre' : getDisplayValue('gender') === 'female' ? 'Mujer' : getDisplayValue('gender') === 'other' ? 'Otro' : getDisplayValue('gender'), icon: Activity, color: 'text-purple-500 bg-purple-500/5 border-purple-500/20' },
                { label: 'Altura (cm)', val: getDisplayValue('height'), icon: Dumbbell, color: 'text-orange-500 bg-orange-500/5 border-orange-500/20' },
                { label: 'Peso Actual (kg)', val: getDisplayValue('weight'), icon: Flame, color: 'text-red-500 bg-red-500/5 border-red-500/20' },
                { label: 'Hábitos Alimenticios', val: getDisplayValue('eatingHabits'), icon: Apple, color: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/20' },
                { label: 'Restricciones / Alergias', val: getDisplayValue('restrictions'), icon: Leaf, color: 'text-amber-500 bg-amber-500/5 border-amber-500/20' },
                { label: 'Horario Diario', val: getDisplayValue('schedule'), icon: Clock, color: 'text-indigo-500 bg-indigo-500/5 border-indigo-500/20' },
                { label: 'Actividad Física', val: getDisplayValue('sportsExperience'), icon: Dumbbell, color: 'text-purple-500 bg-purple-500/5 border-purple-500/20' },
                { label: 'Nivel de Entrenamiento', val: getDisplayValue('trainingLevel'), icon: Flame, color: 'text-rose-500 bg-rose-500/5 border-rose-500/20' },
                { label: 'Días Entrenamiento', val: getDisplayValue('trainingDays'), icon: Calendar, color: 'text-sky-600 bg-sky-500/5 border-sky-500/20' },
                { label: 'Duración por Sesión', val: getDisplayValue('trainingDuration'), icon: Clock, color: 'text-indigo-600 bg-indigo-500/5 border-indigo-500/20' },
                { label: 'Lugar de Entrenamiento', val: getDisplayValue('trainingLocation'), icon: Home, color: 'text-amber-600 bg-amber-500/5 border-amber-500/20' },
                { label: 'Hidratación Diaria', val: getDisplayValue('hydration'), icon: Droplet, color: 'text-sky-500 bg-sky-500/5 border-sky-500/20' },
                { label: 'Descanso y Estrés', val: getDisplayValue('sleepStress'), icon: Moon, color: 'text-yellow-600 bg-yellow-500/5 border-yellow-500/20' },
                { label: 'Frecuencia de Comidas', val: getDisplayValue('mealFrequency'), icon: Utensils, color: 'text-orange-500 bg-orange-500/5 border-orange-500/20' },
                { label: 'Suplementación / Medicación', val: getDisplayValue('supplements'), icon: HeartPulse, color: 'text-pink-500 bg-pink-500/5 border-pink-500/20' },
                { label: 'Dificultades y Barreras', val: getDisplayValue('barriers'), icon: ShieldAlert, color: 'text-red-500 bg-red-500/5 border-red-500/20' },
                { label: 'Observaciones Médicas', val: getDisplayValue('observations'), icon: HeartPulse, color: 'text-rose-500 bg-rose-500/5 border-rose-500/20' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="p-4 rounded-xl border border-muted/70 bg-card hover:bg-muted/10 transition-colors flex flex-col gap-2 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${item.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{item.label}</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground leading-relaxed whitespace-pre-line">{item.val.split(' | ').join('\n')}</p>
                  </div>
                )
              })}
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Cuestionario Nutricional</h1>
        <p className="text-muted-foreground">
          Completa este formulario interactivo para diseñar tu plan ideal.
        </p>
      </div>

      {/* Progress Tracker */}
      <div className="space-y-2.5">
        <div className="flex justify-between text-xs font-semibold text-muted-foreground">
          <span>PREGUNTA {currentStep + 1} DE {steps.length}</span>
          <span className="text-primary">{Math.round(progress)}% COMPLETADO</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <Card className="shadow-md border-white/40 overflow-hidden bg-white/45 backdrop-blur-xl">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-6">
          <CardTitle className="text-xl font-bold">{step.title}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">{step.description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Options Grid or Custom Form */}
          {step.options.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {step.options.map((opt, idx) => {
                const isSelected = selectedOptionIndex === idx
                const Icon = opt.icon
                return (
                  <div
                    key={opt.label}
                    onClick={() => handleSelectOption(idx, opt)}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer select-none group ${isSelected
                      ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                      : 'border-muted hover:border-primary/45 hover:bg-muted/30'
                      }`}
                  >
                    <div className={`p-2.5 rounded-lg transition-colors ${isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-primary/10'
                      }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-sm font-semibold transition-colors ${isSelected ? 'text-primary' : 'text-foreground/90'
                      }`}>
                      {opt.label}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-6 max-w-md mx-auto py-2">
              {step.id === 'physical' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="birthDate" className="text-xs font-bold text-foreground/80 uppercase tracking-wider">Fecha de Nacimiento</Label>
                    <input
                      id="birthDate"
                      type="date"
                      value={answers['birthDate'] || ''}
                      onChange={(e) => {
                        const dateVal = e.target.value
                        const calculatedAge = calculateAge(dateVal)
                        setAnswers((prev) => ({
                          ...prev,
                          birthDate: dateVal,
                          age: calculatedAge !== null ? String(calculatedAge) : ''
                        }))
                      }}
                      className="flex h-11 w-full rounded-full border border-orange-100 bg-white/90 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                    />
                    {answers['age'] && (
                      <p className="text-xs text-muted-foreground ml-2">Edad calculada: <strong className="text-primary">{answers['age']} años</strong></p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-xs font-bold text-foreground/80 uppercase tracking-wider">Sexo</Label>
                    <select
                      id="gender"
                      value={answers['gender'] || ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, gender: e.target.value }))}
                      className="flex h-11 w-full rounded-full border border-orange-100 bg-white/90 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                    >
                      <option value="">— Seleccionar —</option>
                      <option value="male">Hombre</option>
                      <option value="female">Mujer</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height" className="text-xs font-bold text-foreground/80 uppercase tracking-wider">Altura (cm)</Label>
                    <input
                      id="height"
                      type="number"
                      min="100"
                      max="250"
                      placeholder="Ej: 175"
                      value={answers['height'] || ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, height: e.target.value }))}
                      className="flex h-11 w-full rounded-full border border-orange-100 bg-white/90 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight" className="text-xs font-bold text-foreground/80 uppercase tracking-wider">Peso Actual (kg)</Label>
                    <input
                      id="weight"
                      type="number"
                      min="30"
                      max="300"
                      placeholder="Ej: 72"
                      value={answers['weight'] || ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, weight: e.target.value }))}
                      className="flex h-11 w-full rounded-full border border-orange-100 bg-white/90 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Conditional Custom Text Input */}
          {selectedOptionIndex !== null && step.options[selectedOptionIndex]?.isCustom && (
            <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-4 duration-200">
              <Label htmlFor="custom-text" className="text-xs font-bold text-primary">
                Especifica tu respuesta
              </Label>
              <Textarea
                id="custom-text"
                rows={4}
                placeholder={step.placeholder || 'Escribe aquí tu respuesta...'}
                value={customText}
                onChange={(e) => handleCustomTextChange(e.target.value)}
                className="w-full text-sm rounded-lg"
                autoFocus
              />
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex justify-between items-center pt-4 border-t border-muted">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="px-4 gap-2 text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Anterior
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancel}
                className="px-4 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                Cancelar
              </Button>
            </div>
            <Button
              onClick={handleNext}
              disabled={isSubmitting}
              className="px-5 gap-2 text-sm font-semibold"
            >
              {isLast ? (isSubmitting ? 'Enviando...' : 'Finalizar') : (
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
