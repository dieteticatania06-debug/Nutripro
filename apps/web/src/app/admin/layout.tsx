import type { Metadata } from 'next'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { AdminLayoutClient } from '@/components/layout/AdminLayoutClient'
import { DashboardHeader } from '@/components/layout/DashboardHeader'

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | NutriPro Admin' },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayoutClient>
      <div className="h-screen bg-gradient-to-tr from-[#4A7C59] via-[#EBF3EB] to-[#2C5E43] relative overflow-hidden">
        {/* Mismo fondo que auth layout */}
        <div className="absolute top-[10%] right-[10%] w-[500px] h-[500px] rounded-full bg-[#3A875A]/40 blur-[130px] pointer-events-none animate-pulse" style={{ animationDuration: '7s' }} />
        <div className="absolute bottom-[10%] left-[10%] w-[550px] h-[550px] rounded-full bg-amber-400/30 blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute top-[35%] left-[25%] w-[400px] h-[400px] rounded-full bg-[#FAF3EC]/50 blur-[90px] pointer-events-none" />

        <AdminSidebar />
        <div className="lg:pl-[18rem] flex flex-col h-screen relative z-10 overflow-hidden">
          <DashboardHeader />
          <main className="flex-grow min-h-0 overflow-y-auto p-6 max-w-[90rem] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminLayoutClient>
  )
}
