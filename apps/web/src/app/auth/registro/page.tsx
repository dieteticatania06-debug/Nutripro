'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerSchema, type RegisterInput } from '@nutripro/shared'
import { authApi, ApiError } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { useState, useRef } from 'react'
import { Eye, EyeOff, Camera, User } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/layout/Logo'

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterInput>({ 
    resolver: zodResolver(registerSchema),
    defaultValues: {
      avatar: null,
    }
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Por favor selecciona una imagen válida.', variant: 'destructive' })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'La imagen no puede superar los 5MB.', variant: 'destructive' })
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setAvatarPreview(base64)
      setValue('avatar', base64)
    }
    reader.readAsDataURL(file)
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true)
    try {
      await authApi.register(data)
      setIsRegistered(true)
      toast({
        title: '¡Cuenta creada!',
        description: 'Cuenta registrada pendiente de verificación.',
      })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error al registrarse'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  if (isRegistered) {
    return (
      <div className="w-full max-w-md bg-white/25 backdrop-blur-xl border border-white/50 shadow-2xl shadow-orange-950/5 rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between text-center animate-in fade-in duration-300">
        <div className="mt-8 mb-6">
          <h2 className="text-3xl font-serif font-black text-[#2D1E1B]">Revisa tu correo</h2>
          <p className="text-sm text-[#2D1E1B]/75 mt-4 leading-relaxed font-semibold">
            Cuenta registrada pendiente de verificación.
          </p>
          <p className="text-xs text-amber-900 mt-4 leading-relaxed font-bold bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-2">
            Nota: Si no encuentras el correo de activación, por favor revisa tu carpeta de spam.
          </p>
        </div>
        <div className="pt-6 border-t border-orange-100/10">
          <Button asChild className="w-full rounded-full font-bold shadow-sm">
            <Link href="/auth/login">Ir a Iniciar Sesión</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md bg-white/25 backdrop-blur-xl border border-white/50 shadow-2xl shadow-orange-950/5 rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between">
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
      <div className="mt-6 mb-4">
        <h2 className="text-3xl font-serif font-black text-[#2D1E1B]">Crear Cuenta</h2>
      </div>

      {/* Form Content */}
      <form id="register-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        
        {/* Avatar Upload */}
        <div className="flex flex-col items-center space-y-1.5 pb-2">
          <div 
            onClick={triggerFileInput} 
            className="relative w-16 h-16 rounded-full bg-white/60 border-2 border-white flex items-center justify-center cursor-pointer overflow-hidden shadow-md transition-all group hover:scale-105"
          >
            {avatarPreview ? (
              <Image 
                src={avatarPreview} 
                alt="Avatar preview" 
                fill 
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <User className="w-6 h-6 text-[#2D1E1B]/40 group-hover:text-primary transition-colors" />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="w-4 h-4 text-white" />
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          <span className="text-[10px] text-foreground/50 font-bold uppercase tracking-wider cursor-pointer hover:text-primary" onClick={triggerFileInput}>
            Subir foto de perfil (opcional)
          </span>
        </div>

        {/* First & Last Name Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="relative flex items-center bg-white/50 border border-white/40 rounded-full shadow-sm focus-within:bg-white/80 focus-within:border-primary/30 focus-within:ring-4 focus-within:ring-primary/5 transition-all p-1">
              <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#2D1E1B]/50 shadow-sm font-bold text-[10px] select-none flex-shrink-0">
                N
              </div>
              <input
                id="firstName"
                placeholder="nombre"
                {...register('firstName')}
                className="bg-transparent border-0 px-2.5 py-1 text-sm w-full outline-none text-[#2D1E1B] placeholder-[#2D1E1B]/40 font-semibold"
              />
            </div>
            {errors.firstName && <p className="text-[10px] text-destructive ml-4 mt-1 font-semibold">{errors.firstName.message}</p>}
          </div>

          <div className="space-y-1">
            <div className="relative flex items-center bg-white/50 border border-white/40 rounded-full shadow-sm focus-within:bg-white/80 focus-within:border-primary/30 focus-within:ring-4 focus-within:ring-primary/5 transition-all p-1">
              <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#2D1E1B]/50 shadow-sm font-bold text-[10px] select-none flex-shrink-0">
                A
              </div>
              <input
                id="lastName"
                placeholder="apellido"
                {...register('lastName')}
                className="bg-transparent border-0 px-2.5 py-1 text-sm w-full outline-none text-[#2D1E1B] placeholder-[#2D1E1B]/40 font-semibold"
              />
            </div>
            {errors.lastName && <p className="text-[10px] text-destructive ml-4 mt-1 font-semibold">{errors.lastName.message}</p>}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1">
          <div className="relative flex items-center bg-white/50 border border-white/40 rounded-full shadow-sm focus-within:bg-white/80 focus-within:border-primary/30 focus-within:ring-4 focus-within:ring-primary/5 transition-all p-1.5">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#2D1E1B]/70 shadow-sm font-bold text-xs select-none flex-shrink-0">
              @
            </div>
            <input
              id="email"
              type="email"
              placeholder="correo electrónico"
              {...register('email')}
              className="bg-transparent border-0 px-3 py-1 text-sm w-full outline-none text-[#2D1E1B] placeholder-[#2D1E1B]/40 font-semibold"
            />
          </div>
          {errors.email && <p className="text-[10px] text-destructive ml-4 mt-1 font-semibold">{errors.email.message}</p>}
        </div>

        {/* Password */}
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
              placeholder="contraseña (mín. 8 carácteres)"
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

        {/* Confirm Password */}
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
