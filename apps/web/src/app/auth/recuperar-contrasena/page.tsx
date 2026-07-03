'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@nutripro/shared'
import { authApi } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/layout/Logo'

export default function RecuperarContrasenaPage() {
  const [sent, setSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true)
    try {
      await authApi.forgotPassword(data.email)
      setSent(true)
    } catch (err) {
      toast({ title: 'Error', description: 'Inténtalo de nuevo', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-md bg-white/25 backdrop-blur-xl border border-white/50 shadow-2xl shadow-orange-950/5 rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between text-center animate-in fade-in duration-300">
        <div className="mt-8 mb-6">
          <h2 className="text-3xl font-serif font-black text-[#2D1E1B]">Revisa tu email</h2>
          <p className="text-sm text-[#2D1E1B]/75 mt-4 leading-relaxed font-semibold">
            Si el email existe en nuestro sistema, recibirás instrucciones para recuperar tu contraseña.
          </p>
        </div>
        <div className="pt-6 border-t border-orange-100/10">
          <Button asChild variant="outline" className="w-full rounded-full font-bold shadow-sm">
            <Link href="/auth/login">Volver al inicio de sesión</Link>
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
        <h2 className="text-3xl font-serif font-black text-[#2D1E1B]">Recuperar Contraseña</h2>
        <p className="text-xs text-[#2D1E1B]/60 mt-1 font-semibold">Introduce tu email y te enviaremos instrucciones</p>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
