'use client'

import { Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { resetPasswordSchema, type ResetPasswordInput } from '@nutripro/shared'
import { authApi, ApiError } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/layout/Logo'

function NuevaContrasenaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [sent, setSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: token,
      password: '',
      confirmPassword: '',
    }
  })

  const onSubmit = async (data: ResetPasswordInput) => {
    if (!token) {
      toast({ title: 'Error', description: 'Token de recuperación no válido o ausente.', variant: 'destructive' })
      return
    }
    setIsLoading(true)
    try {
      await authApi.resetPassword({
        token,
        password: data.password,
        confirmPassword: data.confirmPassword
      })
      setSent(true)
      toast({
        title: 'Contraseña cambiada',
        description: 'Tu contraseña ha sido restablecida correctamente.',
      })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error al restablecer la contraseña'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-md bg-white/25 backdrop-blur-xl border border-white/50 shadow-2xl shadow-orange-950/5 rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between text-center">
        <div className="mt-8 mb-6">
          <h2 className="text-3xl font-serif font-black text-[#2D1E1B]">¡Contraseña Cambiada!</h2>
          <p className="text-sm text-[#2D1E1B]/75 mt-4 leading-relaxed font-semibold">
            Tu contraseña ha sido restablecida correctamente. Ya puedes acceder a tu cuenta.
          </p>
        </div>
        <div className="pt-6 border-t border-orange-100/10">
          <Button asChild className="w-full rounded-full font-bold shadow-sm">
            <Link href="/auth/login">Iniciar Sesión</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="w-full max-w-md bg-white/25 backdrop-blur-xl border border-white/50 shadow-2xl shadow-orange-950/5 rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between text-center">
        <div className="mt-8 mb-6">
          <h2 className="text-3xl font-serif font-black text-destructive">Enlace Inválido</h2>
          <p className="text-sm text-[#2D1E1B]/75 mt-4 leading-relaxed font-semibold">
            El enlace de recuperación es inválido o ha expirado. Por favor, solicita uno nuevo.
          </p>
        </div>
        <div className="pt-6 border-t border-orange-100/10">
          <Button asChild variant="outline" className="w-full rounded-full font-bold shadow-sm">
            <Link href="/auth/recuperar-contrasena">Solicitar nuevo enlace</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md bg-white/25 backdrop-blur-xl border border-white/50 shadow-2xl shadow-orange-950/5 rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link href="/">
          <Logo className="w-6 h-6" showText={true} textClassName="text-sm font-black tracking-wide" />
        </Link>
        <Link href="/auth/login" className="text-sm font-bold text-[#2D1E1B]/75 hover:text-burgundy transition-colors">
          Iniciar Sesión
        </Link>
      </div>

      {/* Title */}
      <div className="mt-8 mb-6">
        <h2 className="text-3xl font-serif font-black text-[#2D1E1B]">Nueva Contraseña</h2>
        <p className="text-xs text-[#2D1E1B]/60 mt-1 font-semibold">Elige tu nueva clave de acceso</p>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" value={token} {...register('token')} />

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
              placeholder="nueva contraseña"
              {...register('password')}
              className="bg-transparent border-0 px-3 py-1 text-sm w-full pr-12 outline-none text-[#2D1E1B] placeholder-[#2D1E1B]/40 font-semibold"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 bg-white text-foreground/40 hover:text-foreground w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all hover:bg-orange-50"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-[10px] text-destructive ml-4 mt-1 font-semibold">{errors.password.message}</p>}
        </div>

        {/* Confirm Password Input */}
        <div className="space-y-1">
          <div className="relative flex items-center bg-white/50 border border-white/40 rounded-full shadow-sm focus-within:bg-white/80 focus-within:border-primary/30 focus-within:ring-4 focus-within:ring-primary/5 transition-all p-1.5">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#2D1E1B]/70 shadow-sm flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-[#2D1E1B]/60">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-.996.43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </div>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="confirmar contraseña"
              {...register('confirmPassword')}
              className="bg-transparent border-0 px-3 py-1 text-sm w-full pr-12 outline-none text-[#2D1E1B] placeholder-[#2D1E1B]/40 font-semibold"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-2 bg-white text-foreground/40 hover:text-foreground w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all hover:bg-orange-50"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-[10px] text-destructive ml-4 mt-1 font-semibold">{errors.confirmPassword.message}</p>}
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
  )
}

import { Loader } from '@/components/ui/loader'

export default function NuevaContrasenaPage() {
  return (
    <Suspense fallback={<Loader label="Cargando..." />}>
      <NuevaContrasenaContent />
    </Suspense>
  )
}
