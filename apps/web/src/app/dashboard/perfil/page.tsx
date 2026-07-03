'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { profileSchema, type ProfileInput } from '@nutripro/shared'
import type { Profile } from '@nutripro/shared'
import { profileApi, ApiError } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { useRef } from 'react'
import Image from 'next/image'
import { getInitials, getAvatarUrl } from '@/lib/utils'
import { useAuthStore } from '@/features/auth/store/authStore'
import { Upload, Trash2 } from 'lucide-react'

import { Loader } from '@/components/ui/loader'

export default function PerfilPage() {
  const { user } = useAuthStore()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [mounted, setMounted] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    profileApi.get().then((p) => {
      setProfile(p)
      reset({
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone ?? undefined,
        birthDate: p.birthDate ?? undefined,
        gender: p.gender ?? undefined,
        height: p.height ?? undefined,
        weight: p.weight ?? undefined,
        goal: p.goal ?? undefined,
        allergies: p.allergies ?? undefined,
        observations: p.observations ?? undefined,
      })
    }).catch(() => {}).finally(() => setIsLoading(false))
  }, [reset])

  const onSubmit = async (data: ProfileInput) => {
    setIsSaving(true)
    try {
      const updated = await profileApi.update({
        ...data,
        goal: profile?.goal,
        allergies: profile?.allergies,
        observations: profile?.observations,
      })
      setProfile(updated)
      toast({ title: 'Perfil actualizado' })
    } catch (err) {
      toast({ title: 'Error', description: err instanceof ApiError ? err.message : 'Error', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const result = await profileApi.uploadAvatar(file)
      if (result.data?.avatarUrl) {
        setProfile((p) => p ? { ...p, avatarUrl: result.data.avatarUrl } : p)
        toast({ title: 'Foto actualizada' })
      }
    } catch {
      toast({ title: 'Error al subir la foto', variant: 'destructive' })
    } finally {
      setIsUploading(false)
    }
  }

  const handleAvatarDelete = () => {
    if (profile?.avatarUrl) {
      setShowConfirmDelete(true)
    }
  }

  const confirmDelete = async () => {
    setShowConfirmDelete(false)
    setIsUploading(true)
    try {
      await profileApi.deleteAvatar()
      setProfile((p) => p ? { ...p, avatarUrl: null } : p)
      toast({ title: 'Foto de perfil eliminada' })
    } catch {
      toast({ title: 'Error al quitar la foto', variant: 'destructive' })
    } finally {
      setIsUploading(false)
    }
  }

  if (isLoading) return <Loader label="Cargando perfil..." />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground">Gestiona tu información personal</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Avatar */}
        <Card>
          <CardHeader><CardTitle className="text-base">Foto de Perfil</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20 relative">
              <Image src={getAvatarUrl(profile?.avatarUrl, user?.email ?? 'default')} alt="Avatar" width={96} height={96} className="object-cover w-full h-full" />
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            <div className="flex flex-col gap-2 w-full">
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={isUploading}>
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Subiendo...' : 'Cambiar foto'}
              </Button>
              {profile?.avatarUrl && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAvatarDelete} 
                  disabled={isUploading}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Quitar foto
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">{user?.email}</p>
          </CardContent>
        </Card>

        {/* Form */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Información Personal</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input id="firstName" {...register('firstName')} />
                  {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input id="lastName" {...register('lastName')} />
                  {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" type="tel" {...register('phone')} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                  <Input id="birthDate" type="date" {...register('birthDate')} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="height">Altura (cm)</Label>
                  <Input id="height" type="number" {...register('height', { valueAsNumber: true })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="weight">Peso (kg)</Label>
                  <Input id="weight" type="number" step="0.1" {...register('weight', { valueAsNumber: true })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="gender">Sexo</Label>
                  <select id="gender" {...register('gender')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">— Seleccionar —</option>
                    <option value="male">Hombre</option>
                    <option value="female">Mujer</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
              </div>
              <Button type="submit" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {mounted && showConfirmDelete && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1E110A]/40 backdrop-blur-md animate-in fade-in duration-200 p-4">
          <div className="bg-white/85 border border-orange-100/40 shadow-2xl rounded-2xl max-w-sm w-full p-6 backdrop-blur-xl animate-in zoom-in-95 duration-200 space-y-4">
            <div className="space-y-2 text-left">
              <h3 className="text-base font-bold text-foreground">¿Quitar foto de perfil?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                ¿Estás seguro de que deseas eliminar tu foto de perfil? Se restaurará tu avatar por defecto.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmDelete(false)}
              >
                Cerrar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={confirmDelete}
              >
                Quitar foto
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
