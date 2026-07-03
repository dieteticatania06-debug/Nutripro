import type { Metadata } from 'next'
import { ProgressView } from '@/features/progress/components/ProgressView'

export const metadata: Metadata = { title: 'Mi Progreso' }

export default function ProgressPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mi Progreso</h1>
        <p className="text-muted-foreground">Registra tu peso diariamente y visualiza tus estadísticas de cambio</p>
      </div>
      <ProgressView />
    </div>
  )
}
