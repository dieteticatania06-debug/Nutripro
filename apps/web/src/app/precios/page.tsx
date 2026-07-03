import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/layout/Logo'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { cn } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Precios | NutriPro' }

const plans = [
  {
    name: 'Básico',
    price: '15',
    period: 'mes',
    description: 'Para empezar tu cambio',
    features: [
      '✓ Plan nutricional personalizado',
      '✓ Acceso a tu dashboard',
      '✓ Seguimiento mensual',
      '✓ Chat con tu dietista',
      '✗ Rutina deportiva',
      '✗ Seguimiento semanal',
    ],
    highlighted: false,
    badge: null,
  },
  {
    name: 'Pro',
    price: '25',
    period: 'mes',
    description: 'El más popular para resultados óptimos',
    features: [
      '✓ Plan nutricional personalizado',
      '✓ Rutina deportiva personalizada',
      '✓ Seguimiento semanal',
      '✓ Chat ilimitado con tu dietista',
      '✓ Plan de comidas semanal',
      '✓ Estadísticas avanzadas',
    ],
    highlighted: true,
    badge: 'Más popular',
  },
]

export default function PreciosPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#F5EBE1] via-[#FCF6F0] to-[#FAF3EC] text-foreground font-sans relative overflow-hidden">
      {/* Floating Background Blobs */}
      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#3A875A]/25 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="fixed bottom-[-10%] left-[-10%] w-[550px] h-[550px] rounded-full bg-orange-300/20 blur-[130px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />

      <PublicNavbar />
      <div className="max-w-5xl mx-auto pt-28 pb-12 px-4 space-y-10 flex-grow relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        {/* Back button */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-foreground/75 hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver al inicio
        </Link>

        <div className="text-center space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#2D1E1B] font-serif">Planes y Precios</h1>
          <p className="text-muted-foreground text-sm font-medium">Sin permanencia. Cancela cuando quieras.</p>
        </div>



        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                'shadow-md backdrop-blur-xl border-white/60 transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/10 flex flex-col justify-between',
                plan.highlighted
                  ? 'border-primary ring-2 ring-primary/45 bg-white/65'
                  : 'bg-white/45 border-white/40'
              )}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold text-[#2D1E1B]">{plan.name}</CardTitle>
                  {plan.badge && <Badge className="bg-primary text-white hover:bg-primary/95">{plan.badge}</Badge>}
                </div>
                <CardDescription className="text-xs text-foreground/60">{plan.description}</CardDescription>
                <div className="pt-3">
                  <span className="text-4xl font-extrabold text-[#2D1E1B]">{plan.price}€</span>
                  <span className="text-sm font-medium text-foreground/50">/{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                <ul className="space-y-2.5 text-sm font-medium">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className={cn(
                        f.startsWith('✗') ? 'text-foreground/40 font-normal' : 'text-[#2D1E1B]'
                      )}
                    >
                      {f}
                    </li>
                  ))}
                </ul>

              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground font-medium">
          ¿Tienes dudas?{' '}
          <a href="mailto:dieteticatania06@gmail.com" className="text-primary hover:underline font-bold">
            Contáctanos
          </a>{' '}
          y te ayudamos a elegir el plan ideal.
        </p>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/30 py-8 px-4 bg-white/20 backdrop-blur-md relative z-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-medium">
          <Link href="/">
            <Logo showText={true} textClassName="text-sm font-black" className="w-6 h-6" />
          </Link>
          <div className="flex gap-4">
            <Link href="/legal/privacidad" className="hover:text-primary transition-colors">Privacidad</Link>
            <Link href="/legal/cookies" className="hover:text-primary transition-colors">Cookies</Link>
            <Link href="/legal/terminos" className="hover:text-primary transition-colors">Términos</Link>
            <a href="mailto:dieteticatania06@gmail.com" className="hover:text-primary transition-colors">Contacto</a>
          </div>
          <span>© {new Date().getFullYear()} NutriPro. Todos los derechos reservados.</span>
        </div>
      </footer>
    </div>
  )
}
