'use client'

import { useEffect, useState } from 'react'
import { questionnairesApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, getAvatarUrl } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import {
  ClipboardList,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  Calendar,
  Activity,
  Dumbbell,
  Flame,
  Apple,
  Leaf,
  Clock,
  Home,
  Droplet,
  Moon,
  Utensils,
  HeartPulse,
  ShieldAlert,
  Check,
  Baby,
  Sparkles,
  Search,
  Crown,
  Shield
} from 'lucide-react'
import { parseObservations } from '@nutripro/shared'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { toast } from '@/hooks/use-toast'
import { useAdminDashboardStore } from '@/features/dashboard/store/dashboardStore'

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

export default function AdminFormulariosPage() {
  const {
    clients: storeClients,
    questionnaires: storeQuestionnaires,
    isLoaded,
    clientsLoaded,
    questionnairesLoaded,
    reloadClients,
    reloadQuestionnaires
  } = useAdminDashboardStore()

  const [clients, setClients] = useState<ClientOption[]>([])
  const [questionnaires, setQuestionnaires] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Record<string, string> | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [isLoading, setIsLoading] = useState(!clientsLoaded || !questionnairesLoaded)

  const load = async () => {
    setIsLoading(true)
    try {
      const promises: Promise<any>[] = []
      if (!clientsLoaded) promises.push(reloadClients())
      if (!questionnairesLoaded) promises.push(reloadQuestionnaires())
      await Promise.all(promises)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isLoaded) {
      if (!clientsLoaded || !questionnairesLoaded) {
        load()
      } else {
        setClients(storeClients)
        setQuestionnaires(storeQuestionnaires)
        setIsLoading(false)
      }
    }
  }, [isLoaded, clientsLoaded, questionnairesLoaded, storeClients, storeQuestionnaires])

  const handleToggleExpand = async (clientId: string, questionnaireId: string | undefined) => {
    if (expandedClientId === clientId) {
      setExpandedClientId(null)
      setDetail(null)
      return
    }

    setExpandedClientId(clientId)
    setDetail(null)

    if (!questionnaireId) {
      return
    }

    setLoadingDetail(true)
    try {
      const data = await questionnairesApi.get(questionnaireId)
      setDetail(data as unknown as Record<string, string>)
    } catch (err: any) {
      toast({
        title: 'Error al cargar detalles',
        description: err.message || 'No se pudieron recuperar las respuestas del cuestionario.',
        variant: 'destructive',
      })
    } finally {
      setLoadingDetail(false)
    }
  }

  const filteredClients = clients.filter((c) => {
    const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.toLowerCase()
    const email = c.email.toLowerCase()
    const query = search.toLowerCase()
    return name.includes(query) || email.includes(query)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Formularios Nutricionales</h1>
        <p className="text-muted-foreground">Respuestas de tus clientes</p>
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

      <div className="space-y-4">
        {isLoading ? (
          <Loader label="Cargando formularios..." />
        ) : filteredClients.length === 0 ? (
          <Card className="border border-white/40 bg-white/45 backdrop-blur-xl">
            <CardContent className="text-center py-8">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No se encontraron clientes</p>
            </CardContent>
          </Card>
        ) : (
          filteredClients.map((client) => {
            const clientQuestionnaire = questionnaires.find((q) => q.userId === client.id)
            const isExpanded = expandedClientId === client.id
            const clientName = `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() || client.email

            return (
              <Card
                key={client.id}
                className="overflow-hidden border border-white/40 bg-white/45 backdrop-blur-xl shadow-sm transition-all"
              >
                <CardHeader
                  className="p-4 bg-white/30 cursor-pointer hover:bg-white/50 transition-colors flex flex-row items-center justify-between space-y-0"
                  onClick={() => handleToggleExpand(client.id, clientQuestionnaire?.id)}
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
                      <p className="text-xs text-muted-foreground">
                        {client.email} {clientQuestionnaire ? `· Enviado el ${formatDate(clientQuestionnaire.submittedAt)}` : '· Sin enviar'}
                      </p>
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
                      onClick={() => handleToggleExpand(client.id, clientQuestionnaire?.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="p-6 border-t bg-muted/5 space-y-6 animate-in fade-in duration-200">
                    {!clientQuestionnaire ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Este cliente no ha enviado ningún formulario todavía.</p>
                    ) : loadingDetail ? (
                      <Loader label="Cargando detalles..." />
                    ) : !detail ? (
                      <Loader label="Cargando detalles..." />
                    ) : (() => {
                      const parsed = parseObservations(detail.observations)

                      const getDisplayValue = (key: string) => {
                        const obsStr = detail.observations
                        const packedKeys = [
                          'hydration',
                          'sleepStress',
                          'mealFrequency',
                          'supplements',
                          'barriers',
                          'observations',
                          'age',
                          'height',
                          'weight',
                          'birthDate',
                          'gender',
                          'trainingDays',
                          'trainingDuration',
                          'trainingLocation',
                          'trainingLevel',
                        ]

                        if (packedKeys.includes(key) && key !== 'observations') {
                          const val = parsed[key as keyof typeof parsed]
                          if (!val) return 'Ninguna'
                          if (val.startsWith('Otro: ')) return val.replace('Otro: ', '')
                          return val
                        }

                        let val = ''
                        if (key === 'observations') {
                          val = parsed.observations || (obsStr && !obsStr.includes(' | ') ? obsStr : '')
                        } else {
                          val = detail[key]
                        }

                        if (!val) return 'Ninguna'
                        if (val.startsWith('Otro: ')) return val.replace('Otro: ', '')
                        return val
                      }

                      const displayItems = [
                        {
                          label: 'Objetivo Principal',
                          val: getDisplayValue('objectives'),
                          icon: TrendingDown,
                          color: 'text-blue-500 bg-blue-500/5 border-blue-500/20',
                        },
                        {
                          label: 'Fecha de Nacimiento',
                          val: getDisplayValue('birthDate'),
                          icon: Calendar,
                          color: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/20',
                        },
                        {
                          label: 'Edad (años)',
                          val: getDisplayValue('age'),
                          icon: Calendar,
                          color: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/20',
                        },
                        {
                          label: 'Sexo',
                          val:
                            getDisplayValue('gender') === 'male'
                              ? 'Hombre'
                              : getDisplayValue('gender') === 'female'
                                ? 'Mujer'
                                : getDisplayValue('gender') === 'other'
                                  ? 'Otro'
                                  : getDisplayValue('gender'),
                          icon: Activity,
                          color: 'text-purple-500 bg-purple-500/5 border-purple-500/20',
                        },
                        {
                          label: 'Altura (cm)',
                          val: getDisplayValue('height'),
                          icon: Dumbbell,
                          color: 'text-orange-500 bg-orange-500/5 border-orange-500/20',
                        },
                        {
                          label: 'Peso Actual (kg)',
                          val: getDisplayValue('weight'),
                          icon: Flame,
                          color: 'text-red-500 bg-red-500/5 border-red-500/20',
                        },
                        {
                          label: 'Hábitos Alimenticios',
                          val: getDisplayValue('eatingHabits'),
                          icon: Apple,
                          color: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/20',
                        },
                        {
                          label: 'Restricciones / Alergias',
                          val: getDisplayValue('restrictions'),
                          icon: Leaf,
                          color: 'text-amber-500 bg-amber-500/5 border-amber-500/20',
                        },
                        {
                          label: 'Horario Diario',
                          val: getDisplayValue('schedule'),
                          icon: Clock,
                          color: 'text-indigo-500 bg-indigo-500/5 border-indigo-500/20',
                        },
                        {
                          label: 'Actividad Física',
                          val: getDisplayValue('sportsExperience'),
                          icon: Dumbbell,
                          color: 'text-purple-500 bg-purple-500/5 border-purple-500/20',
                        },
                        {
                          label: 'Nivel de Entrenamiento',
                          val: getDisplayValue('trainingLevel'),
                          icon: Flame,
                          color: 'text-rose-500 bg-rose-500/5 border-rose-500/20',
                        },
                        {
                          label: 'Días Entrenamiento',
                          val: getDisplayValue('trainingDays'),
                          icon: Calendar,
                          color: 'text-sky-600 bg-sky-500/5 border-sky-500/20',
                        },
                        {
                          label: 'Duración por Sesión',
                          val: getDisplayValue('trainingDuration'),
                          icon: Clock,
                          color: 'text-indigo-600 bg-indigo-500/5 border-indigo-600/20',
                        },
                        {
                          label: 'Lugar de Entrenamiento',
                          val: getDisplayValue('trainingLocation'),
                          icon: Home,
                          color: 'text-amber-600 bg-amber-500/5 border-amber-500/20',
                        },
                        {
                          label: 'Hidratación Diaria',
                          val: getDisplayValue('hydration'),
                          icon: Droplet,
                          color: 'text-sky-500 bg-sky-500/5 border-sky-500/20',
                        },
                        {
                          label: 'Descanso y Estrés',
                          val: getDisplayValue('sleepStress'),
                          icon: Moon,
                          color: 'text-yellow-600 bg-yellow-500/5 border-yellow-500/20',
                        },
                        {
                          label: 'Frecuencia de Comidas',
                          val: getDisplayValue('mealFrequency'),
                          icon: Utensils,
                          color: 'text-orange-500 bg-orange-500/5 border-orange-500/20',
                        },
                        {
                          label: 'Suplementación / Medicación',
                          val: getDisplayValue('supplements'),
                          icon: HeartPulse,
                          color: 'text-pink-500 bg-pink-500/5 border-pink-500/20',
                        },
                        {
                          label: 'Dificultades y Barreras',
                          val: getDisplayValue('barriers'),
                          icon: ShieldAlert,
                          color: 'text-red-500 bg-red-500/5 border-red-500/20',
                        },
                        {
                          label: 'Observaciones Médicas',
                          val: getDisplayValue('observations'),
                          icon: HeartPulse,
                          color: 'text-rose-500 bg-rose-500/5 border-rose-500/20',
                        },
                      ]

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {displayItems.map((item) => {
                            const Icon = item.icon
                            return (
                              <div
                                key={item.label}
                                className="p-4 rounded-xl border border-muted/70 bg-card hover:bg-muted/10 transition-colors flex flex-col gap-2 shadow-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`p-1.5 rounded-lg ${item.color}`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    {item.label}
                                  </span>
                                </div>
                                <p className="text-sm font-semibold text-foreground leading-relaxed whitespace-pre-line">
                                  {item.val.split(' | ').join('\n')}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </CardContent>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
