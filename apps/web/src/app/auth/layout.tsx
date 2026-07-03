import type { Metadata } from 'next'
import { AuthBackground } from '@/components/auth/AuthBackground'

export const metadata: Metadata = {
  title: 'Acceso',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-tr from-[#4A7C59] via-[#EBF3EB] to-[#2C5E43] relative overflow-hidden">
      {/* High contrast dynamic blurred background gradients for glassmorphism pop */}
      <div className="absolute top-[10%] right-[10%] w-[500px] h-[500px] rounded-full bg-[#3A875A]/40 blur-[130px] pointer-events-none animate-pulse" style={{ animationDuration: '7s' }} />
      <div className="absolute bottom-[10%] left-[10%] w-[550px] h-[550px] rounded-full bg-amber-400/30 blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />
      <div className="absolute top-[35%] left-[25%] w-[400px] h-[400px] rounded-full bg-[#FAF3EC]/50 blur-[90px] pointer-events-none" />

      {/* Background Image Loader */}
      <AuthBackground />

      <main className="flex-1 flex items-center justify-center px-4 py-12 z-10">
        {children}
      </main>
    </div>
  )
}
