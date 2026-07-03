'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/features/auth/store/authStore'
import { Logo } from '@/components/layout/Logo'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Target, ShieldAlert, Sparkles, Dumbbell, Apple, Activity, Flame, Clock } from 'lucide-react'

const objectivesDetails: Record<string, {
  title: string
  subtitle: string
  heroDesc: string
  nutritionalTitle: string
  nutritionalDesc: string
  nutritionalPoints: string[]
  trainingTitle: string
  trainingDesc: string
  trainingPoints: string[]
  icon: React.ComponentType<{ className?: string }>
  themeColor: { bg: string; border: string; text: string; iconBg: string; iconColor: string }
}> = {
  'perder-grasa': {
    title: 'Perder Grasa',
    subtitle: 'Define tu figura de forma saludable, progresiva y sin pasar hambre.',
    heroDesc: 'Nuestro método para la pérdida de grasa se enfoca en un déficit calórico controlado y personalizado, garantizando que pierdas grasa corporal mientras preservas al máximo tu masa muscular y tus niveles de energía diarios.',
    nutritionalTitle: 'Estrategia Nutricional',
    nutritionalDesc: 'Una pauta de alimentación adaptada para crear un déficit calórico moderado sin restricciones innecesarias:',
    nutritionalPoints: [
      'Déficit calórico individualizado para evitar el efecto rebote.',
      'Suficiente proteína para proteger el músculo.',
      'Alimentos de alta densidad nutricional y saciantes para evitar el hambre.',
      'Distribución flexible de comidas acorde a tus horarios diarios.'
    ],
    trainingTitle: 'Pauta de Entrenamiento',
    trainingDesc: 'El ejercicio de fuerza es el pilar para mantener tu metabolismo activo durante la pérdida de grasa:',
    trainingPoints: [
      'Rutina de fuerza enfocada en la intensidad para señalizar la retención muscular.',
      'Cardio moderado como complemento de salud.',
      'Volumen adaptado a tu nivel.',
      'Énfasis en la progresión de cargas para evitar pérdidas de rendimiento.'
    ],
    icon: Apple,
    themeColor: { bg: 'bg-orange-500/10', border: 'border-orange-200/30', text: 'text-orange-950', iconBg: 'bg-orange-500/20', iconColor: 'text-orange-600' }
  },
  'comer-saludable': {
    title: 'Comer más Saludable',
    subtitle: 'Mejora tu relación con la comida y adquiere hábitos de por vida.',
    heroDesc: 'Aprender a comer sano no consiste en seguir una dieta estricta temporal, sino en entender qué nutrientes necesita tu cuerpo y cómo incorporarlos de manera flexible y placentera en tu rutina familiar y social.',
    nutritionalTitle: 'Estrategia Nutricional',
    nutritionalDesc: 'Educación nutricional y menús variados para que disfrutes cuidándote:',
    nutritionalPoints: [
      'Pauta isocalórica o adaptada a tu peso saludable.',
      'Aporte abundante de frutas, verduras, legumbres e ingredientes reales.',
      'Flexibilidad social: aprende a gestionar comidas fuera de casa.',
      'Mejora de la salud digestiva y niveles constantes de energía.'
    ],
    trainingTitle: 'Pauta de Entrenamiento',
    trainingDesc: 'Fomentamos un estilo de vida activo que mejore tu bienestar general y cardiovascular:',
    trainingPoints: [
      'Entrenamientos enfocados en la salud integral y movilidad articular.',
      'Rutinas adaptadas para casa o gimnasio según tu preferencia.',
      'Ejercicios que mejoran la postura diaria y previenen dolores de espalda.',
      'Progresión amable adaptada a tu ritmo y disponibilidad de tiempo.'
    ],
    icon: ShieldAlert,
    themeColor: { bg: 'bg-green-500/10', border: 'border-green-200/30', text: 'text-green-950', iconBg: 'bg-green-500/20', iconColor: 'text-green-600' }
  },
  'ganar-musculo': {
    title: 'Ganar Músculo',
    subtitle: 'Construye masa magra y aumenta tu fuerza con ciencia y constancia.',
    heroDesc: 'El aumento de masa muscular requiere un estímulo de entrenamiento de fuerza adecuado y una nutrición que provea los bloques de construcción y la energía necesarios para la síntesis de proteínas musculares.',
    nutritionalTitle: 'Estrategia Nutricional',
    nutritionalDesc: 'Superávit calórico controlado y optimización de macronutrientes para el anabolismo:',
    nutritionalPoints: [
      'Superávit calórico controlado (dieta hipercalórica) para ganar músculo limpio.',
      'Aporte óptimo de proteínas (mínimo 1.8g a 2.2g por kg de peso diario).',
      'Carbohidratos suficientes para maximizar el rendimiento en las sesiones.',
      'Suplementación recomendada con base científica (ej: creatina, si aplica).'
    ],
    trainingTitle: 'Pauta de Entrenamiento',
    trainingDesc: 'Estímulo mecánico enfocado en la tensión muscular y la sobrecarga progresiva:',
    trainingPoints: [
      'Rutinas estructuradas en base a tu nivel de fuerza.',
      'Ejercicios multiarticulares con peso libre y aislamiento específico.',
      'Rangos de repeticiones ideales para hipertrofia (8 a 12 repeticiones).',
      'Pautas claras de tiempos de descanso óptimos para máxima recuperación.'
    ],
    icon: Dumbbell,
    themeColor: { bg: 'bg-purple-500/10', border: 'border-purple-200/30', text: 'text-purple-950', iconBg: 'bg-purple-500/20', iconColor: 'text-purple-600' }
  },
  'rendimiento-deportivo': {
    title: 'Mejorar Rendimiento',
    subtitle: 'Supera tus marcas, optimiza tu energía y acelera la recuperación.',
    heroDesc: 'Para deportistas aficionados o avanzados que buscan rendir al máximo en sus disciplinas. Adaptamos la nutrición al tipo de deporte (resistencia, fuerza o mixto) para recargar depósitos de glucógeno y mejorar tus tiempos.',
    nutritionalTitle: 'Estrategia Nutricional',
    nutritionalDesc: 'Timing nutricional enfocado en la energía intra y post-entrenamiento:',
    nutritionalPoints: [
      'Planificación de ingestas en torno a las sesiones de entrenamiento.',
      'Recarga de glucógeno muscular y estrategias de hidratación específicas.',
      'Proteína para regeneración y antioxidantes para atenuar el daño muscular.',
      'Estrategias personalizadas para días de competición o entrenos exigentes.'
    ],
    trainingTitle: 'Pauta de Entrenamiento',
    trainingDesc: 'Fisicalidad complementaria para mejorar tu capacidad deportiva:',
    trainingPoints: [
      'Rutinas orientadas al desarrollo de potencia, fuerza explosiva o resistencia.',
      'Ejercicios que fortalecen el core y previenen lesiones deportivas comunes.',
      'Planificación del volumen según tu calendario competitivo.',
      'Enfoque en la movilidad dinámica y la agilidad corporal.'
    ],
    icon: Flame,
    themeColor: { bg: 'bg-sky-500/10', border: 'border-sky-200/30', text: 'text-sky-950', iconBg: 'bg-sky-500/20', iconColor: 'text-sky-600' }
  }
}

export default function ObjetivoDetallePage() {
  const params = useParams()
  const router = useRouter()
  const slug = typeof params.slug === 'string' ? params.slug : 'perder-grasa'

  const { isAuthenticated } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const data = objectivesDetails[slug]

  if (!data) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-4">
        <h1 className="text-2xl font-bold">Objetivo no encontrado</h1>
        <Button onClick={() => router.push('/')} className="mt-4">Volver al inicio</Button>
      </div>
    )
  }

  const Icon = data.icon

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#F5EBE1] via-[#FCF6F0] to-[#FAF3EC] text-foreground font-sans relative overflow-hidden">
      <PublicNavbar />

      {/* Floating Background Blobs */}
      <div className="fixed top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#3A875A]/10 blur-[130px] pointer-events-none z-0" />
      <div className="fixed bottom-[-5%] left-[-10%] w-[500px] h-[500px] rounded-full bg-orange-200/20 blur-[130px] pointer-events-none z-0" />

      <main className="flex-grow pt-28 pb-20 px-4 relative z-10">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Back button */}
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-foreground/75 hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> Volver al inicio
          </Link>

          {/* Hero Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-3xl ${data.themeColor.bg} border ${data.themeColor.border} flex items-center justify-center`}>
                <Icon className={`w-10 h-10 ${data.themeColor.iconColor}`} />
              </div>
              <div>
                <span className="text-xs font-bold text-primary tracking-widest uppercase">Objetivo Detallado</span>
                <h1 className="text-3xl md:text-5xl font-bold font-serif text-[#2D1E1B]">{data.title}</h1>
              </div>
            </div>
            <p className="text-lg md:text-xl text-foreground/80 font-medium leading-relaxed">{data.subtitle}</p>
            <p className="text-base text-foreground/70 leading-relaxed max-w-3xl pt-2">{data.heroDesc}</p>
          </div>

          {/* Strategies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            {/* Nutritional Strategy Card */}
            <CardLayout title={data.nutritionalTitle} desc={data.nutritionalDesc} points={data.nutritionalPoints} isNutri={true} />

            {/* Training Strategy Card */}
            <CardLayout title={data.trainingTitle} desc={data.trainingDesc} points={data.trainingPoints} isNutri={false} />
          </div>

          {/* CTA Box */}
          {(!mounted || !isAuthenticated) && (
            <div className="bg-white/45 backdrop-blur-xl border border-white/50 rounded-[2.5rem] p-8 md:p-12 text-center space-y-6 shadow-xl shadow-orange-950/[0.01]">
              <h2 className="text-2xl md:text-3xl font-bold font-serif text-[#2D1E1B]">¿Listo para conseguir tu objetivo?</h2>
              <p className="text-sm md:text-base text-foreground/75 max-w-xl mx-auto leading-relaxed">
                Regístrate hoy, completa nuestro cuestionario nutricional y tu dietista experto diseñará tu pauta de alimentación y entrenamiento a medida.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                <Button asChild size="lg" className="px-8 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
                  <Link href="/auth/registro">Registrarme y empezar gratis →</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#F5EBE1] py-8 px-4 border-t border-orange-100/30 flex flex-col items-center gap-2 text-center text-xs text-[#2D1E1B]/50 mt-12 font-medium">
        <Link href="/">
          <Logo showText={true} textClassName="text-sm font-black" className="w-6 h-6" />
        </Link>
        <span>© {new Date().getFullYear()} NutriPro. Todos los derechos reservados.</span>
      </footer>
    </div>
  )
}

function CardLayout({ title, desc, points, isNutri }: { title: string; desc: string; points: string[]; isNutri: boolean }) {
  const Icon = isNutri ? Apple : Dumbbell
  return (
    <div className="bg-white/45 backdrop-blur-xl rounded-[2rem] border border-white/50 p-6 md:p-8 shadow-md hover:shadow-lg transition-all duration-300 flex flex-col space-y-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${isNutri ? 'bg-orange-500/10 text-orange-600' : 'bg-purple-500/10 text-purple-600'} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-bold text-[#2D1E1B]">{title}</h3>
      </div>
      <p className="text-sm text-foreground/75 leading-relaxed">{desc}</p>
      <ul className="space-y-3 pt-2 flex-grow">
        {points.map((p) => (
          <li key={p} className="text-sm flex items-start gap-2.5">
            <span className="text-primary font-bold mt-0.5">✓</span>
            <span className="text-foreground/75 leading-relaxed">{p}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
