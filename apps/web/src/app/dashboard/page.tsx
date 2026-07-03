import type { Metadata } from 'next'
import { DashboardOverview } from '@/features/dashboard/components/DashboardOverview'

export const metadata: Metadata = { title: 'Dashboard' }

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mi Panel</h1>
        <p className="text-muted-foreground">Bienvenido de vuelta a NutriPro</p>
      </div>
      <DashboardOverview />
    </div>
  )
}
