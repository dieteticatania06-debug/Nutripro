'use client'

import { Suspense, useState, useEffect } from 'react'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { loginSchema, type LoginInput } from '@nutripro/shared'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useClientDashboardStore, useAdminDashboardStore } from '@/features/dashboard/store/dashboardStore'
import { toast } from '@/hooks/use-toast'
import { ApiError } from '@/lib/api'
import { Eye, EyeOff } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? ''
  const { login, isLoading, user, isAuthenticated } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [loadingText, setLoadingText] = useState('Autenticando...')

  useEffect(() => {
    if (isAuthenticated && user) {
      if (redirect && redirect !== '/auth/login') {
        router.replace(redirect)
      } else if (user.role === 'admin') {
        router.replace('/admin')
      } else {
        router.replace('/dashboard')
      }
    }
  }, [isAuthenticated, user, redirect, router])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginInput) => {
    try {
      await login(data.email, data.password)
      const storeUser = useAuthStore.getState().user
      
      setIsRedirecting(true)
      setProgress(15)
      setLoadingText('Autenticando...')
      
      if (storeUser?.role === 'admin') {
        const adminStore = useAdminDashboardStore.getState()
        
        setProgress(35)
        setLoadingText('Cargando estadísticas del panel...')
        await adminStore.fetchData(true)
        
        setProgress(55)
        setLoadingText('Cargando lista de clientes...')
        await adminStore.reloadClients()
        
        setProgress(75)
        setLoadingText('Cargando dietas y rutinas...')
        await Promise.all([
          adminStore.reloadDiets(),
          adminStore.reloadWorkouts(),
        ])
        
        setProgress(90)
        setLoadingText('Cargando citas y formularios...')
        await Promise.all([
          adminStore.reloadAppointments(),
          adminStore.reloadChats(),
          adminStore.reloadQuestionnaires(),
        ])
      } else {
        const clientStore = useClientDashboardStore.getState()
        
        setProgress(50)
        setLoadingText('Cargando tu perfil y dietas...')
        await clientStore.fetchData(true)
        
        setProgress(85)
        setLoadingText('Sincronizando mensajería y citas...')
      }
      
      setProgress(100)
      setLoadingText('¡Listo! Redirigiendo...')
      
      setTimeout(() => {
        if (redirect && redirect !== '/auth/login') {
          router.push(redirect)
        } else if (storeUser?.role === 'admin') {
          router.push('/admin')
        } else {
          router.push('/dashboard')
        }
      }, 600)
    } catch (err) {
      setIsRedirecting(false)
      let message = err instanceof ApiError ? err.message : 'Error al iniciar sesión'
      if (message === 'Verifica tu email antes de iniciar sesión') {
        message = 'Verifica tu email antes de iniciar sesión (si no lo encuentras, revisa en tu carpeta de spam)'
      }
      toast({ title: 'Error', description: message, variant: 'destructive' })
    }
  }

  return (
    <>
      <div className="w-full max-w-md bg-white/25 backdrop-blur-xl border border-white/50 shadow-2xl shadow-orange-950/5 rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <Link href="/">
            <Logo className="w-6 h-6" showText={true} textClassName="text-sm font-black tracking-wide" />
          </Link>
          <Link href="/auth/registro" className="text-sm font-bold text-[#2D1E1B]/75 hover:text-burgundy transition-colors">
            Registrarse
          </Link>
        </div>

        {/* Title */}
        <div className="mt-8 mb-6">
          <h2 className="text-3xl md:text-4xl font-serif font-black text-[#2D1E1B]">Iniciar Sesión</h2>
        </div>

        {/* Form Content */}
        <form id="login-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email Input */}
          <div className="space-y-1">
            <div className="relative flex items-center bg-white/50 border border-white/40 rounded-full shadow-sm focus-within:bg-white/80 focus-within:border-primary/30 focus-within:ring-4 focus-within:ring-primary/5 transition-all p-1.5">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#2D1E1B]/70 shadow-sm font-bold text-xs select-none flex-shrink-0">
                @
              </div>
              <input
                id="email"
                type="email"
                placeholder="correo electrónico"
                autoComplete="email"
                {...register('email')}
                className="bg-transparent border-0 px-3 py-1 text-sm w-full outline-none text-[#2D1E1B] placeholder-[#2D1E1B]/40 font-semibold"
              />
            </div>
            {errors.email && <p className="text-[10px] text-destructive ml-4 mt-1 font-semibold">{errors.email.message}</p>}
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <div className="relative flex items-center bg-white/50 border border-white/40 rounded-full shadow-sm focus-within:bg-white/80 focus-within:border-primary/30 focus-within:ring-4 focus-within:ring-primary/5 transition-all p-1.5">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#2D1E1B]/70 shadow-sm flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-[#2D1E1B]/60">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-.996.43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="contraseña"
                autoComplete="current-password"
                {...register('password')}
                className="bg-transparent border-0 px-3 py-1 text-sm w-full pr-12 outline-none text-[#2D1E1B] placeholder-[#2D1E1B]/40 font-semibold"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 bg-white text-foreground/40 hover:text-foreground w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all hover:bg-orange-50"
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex justify-between items-center px-4 pt-1">
              <div className="min-h-[15px]">
                {errors.password && <p className="text-[10px] text-destructive font-semibold">{errors.password.message}</p>}
              </div>
              <Link 
                href="/auth/recuperar-contrasena" 
                className="text-[11px] font-bold text-[#2D1E1B]/60 hover:text-primary transition-colors hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>


          {/* Bottom Submission */}
          <div className="flex items-center justify-end pt-6 border-t border-orange-100/10">
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-14 h-10 rounded-[1.25rem_2rem_2rem_1.25rem] bg-[#1D1412] hover:bg-primary text-white flex items-center justify-center shadow-lg shadow-orange-950/15 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>

      {isRedirecting && (
        <div className="fixed inset-0 bg-[#FAF3EC]/85 dark:bg-zinc-950/85 backdrop-blur-xl z-[9999] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="text-center space-y-6 w-full max-w-sm animate-in zoom-in-95 duration-500 delay-100 fill-mode-both">
            {/* Glowing Logo */}
            <div className="relative w-24 h-24 mx-auto rounded-full bg-white dark:bg-zinc-900 border border-primary/20 shadow-2xl flex items-center justify-center animate-pulse">
              <Logo className="w-14 h-14" />
            </div>
            
            <div className="space-y-3">
              <h3 className="text-2xl font-serif font-bold text-[#2D1E1B] dark:text-zinc-100">
                ¡Hola de nuevo!
              </h3>
              <p className="text-xs font-semibold text-primary/80 min-h-[16px]">
                {loadingText}
              </p>
            </div>

            {/* Progress Bar Container */}
            <div className="space-y-1.5 pt-2">
              <div className="w-full h-2 bg-[#2D1E1B]/10 dark:bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-[10px] font-bold text-[#2D1E1B]/50 dark:text-white/40 text-right">
                {progress}%
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

import { Loader } from '@/components/ui/loader'

export default function LoginPage() {
  return (
    <Suspense fallback={<Loader label="Cargando..." />}>
      <LoginContent />
    </Suspense>
  )
}
