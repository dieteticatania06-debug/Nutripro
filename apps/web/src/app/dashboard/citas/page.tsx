import type { Metadata } from 'next'
import { CitasView } from '@/features/appointments/components/CitasView'

export const metadata: Metadata = { title: 'Mis Citas' }

export default function CitasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mis Citas</h1>
        <p className="text-muted-foreground">Gestiona tus citas con tu dietista</p>
      </div>
      <CitasView />
    </div>
  )
}
