import type { Metadata } from 'next'
import { LandingView } from '@/components/layout/LandingView'

export const metadata: Metadata = {
  title: 'NutriPro — Asesoría Nutricional Profesional',
  description: 'Transforma tu salud con un plan nutricional personalizado. Dietista online, dietas personalizadas y seguimiento continuo.',
}

export default function HomePage() {
  return <LandingView />
}
