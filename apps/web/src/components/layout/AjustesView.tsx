'use client'

import { useEffect, useState } from 'react'
import { profileApi } from '@/lib/api'
import type { Profile } from '@nutripro/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader } from '@/components/ui/loader'
import { Sun, Moon, ArrowLeft, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface AjustesViewProps {
  backUrl: string
  roleTitle: string
}

export function AjustesView({ backUrl, roleTitle }: AjustesViewProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [themeState, setThemeState] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Initialize theme state from document class list
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark')
      setThemeState(isDark ? 'dark' : 'light')
    }

    profileApi.get()
      .then((p) => {
        setProfile(p)
        if (p.theme) {
          setThemeState(p.theme)
        }
      })
      .catch((err) => {
        console.error('Error fetching profile for settings:', err)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const handleThemeToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const isDark = themeState === 'dark'
    const newTheme = isDark ? 'light' : 'dark'

    const applyTheme = () => {
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      localStorage.setItem('theme', newTheme)
      setThemeState(newTheme)

      // Persist theme on backend
      if (profile) {
        profileApi.update({ ...profile, theme: newTheme })
          .then((updated) => setProfile(updated))
          .catch((err) => console.error('Error saving theme to backend:', err))
      }
    }

    // Add transitioning helper class to body for smooth fallback CSS transitions
    document.body.classList.add('theme-transitioning')
    setTimeout(() => {
      document.body.classList.remove('theme-transitioning')
    }, 600)

    // Check if browser supports View Transitions API
    // @ts-ignore
    if (!document.startViewTransition) {
      applyTheme()
      return
    }

    // Calculate center of click coordinates
    const x = e.clientX
    const y = e.clientY
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    // @ts-ignore
    const transition = document.startViewTransition(() => {
      applyTheme()
    })

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`
      ]
      document.documentElement.animate(
        {
          clipPath: isDark ? [...clipPath].reverse() : clipPath
        },
        {
          duration: 450,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: isDark
            ? '::view-transition-old(root)'
            : '::view-transition-new(root)'
        }
      )
    })
  }

  if (!mounted) return null
  if (isLoading) return <Loader label="Cargando tus ajustes..." />

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="rounded-full hover:bg-white/40 dark:hover:bg-zinc-800/40 text-foreground">
          <Link href={backUrl} aria-label="Volver">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Ajustes</h1>
          <p className="text-muted-foreground text-xs font-semibold">Configuración de {roleTitle}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Appearance Card */}
        <Card className="bg-white/45 dark:bg-zinc-950/45 backdrop-blur-xl border border-white/50 dark:border-zinc-800/80 shadow-xl rounded-[2rem] overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              Apariencia
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Elige cómo se ve la interfaz de tu panel de control de NutriPro.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-[#2D1E1B]/5 dark:border-white/5">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-foreground block">
                  {themeState === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {themeState === 'dark' 
                    ? 'Disfruta de una interfaz oscura ideal para la noche.' 
                    : 'Disfruta de la interfaz clara y natural clásica.'}
                </span>
              </div>

              {/* Custom Switch Toggle */}
              <button
                onClick={handleThemeToggle}
                className="relative inline-flex h-9 w-16 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 bg-primary/25 dark:bg-zinc-800"
                role="switch"
                aria-checked={themeState === 'dark'}
              >
                <span
                  className={`pointer-events-none flex h-7.5 w-7.5 items-center justify-center rounded-full bg-white dark:bg-zinc-950 shadow-md ring-0 transition-transform duration-300 ease-in-out ${
                    themeState === 'dark' ? 'translate-x-7 text-emerald-400' : 'translate-x-0.5 text-amber-500'
                  }`}
                >
                  {themeState === 'dark' ? (
                    <Moon className="h-4.5 w-4.5 fill-current" />
                  ) : (
                    <Sun className="h-4.5 w-4.5 fill-current" />
                  )}
                </span>
              </button>
            </div>

            {/* Quick Palette Preview Grid */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              {/* Light Mode Preview */}
              <button 
                type="button"
                onClick={(e) => { if (themeState === 'dark') handleThemeToggle(e) }}
                className={`flex flex-col gap-2 rounded-2xl p-3 border-2 text-left bg-[#FAF3EC] text-[#2D1E1B] transition-all relative ${
                  themeState === 'light' ? 'border-primary ring-2 ring-primary/10' : 'border-white/50 dark:border-zinc-800'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold">Claro (Clásico)</span>
                  {themeState === 'light' && <span className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <div className="flex gap-1.5 mt-1">
                  <div className="w-5 h-5 rounded-full bg-[#3A875A]" />
                  <div className="w-5 h-5 rounded-full bg-white border border-[#2D1E1B]/10" />
                  <div className="w-5 h-5 rounded-full bg-[#FAF3EC] border border-[#2D1E1B]/10" />
                </div>
              </button>

              {/* Dark Mode Preview */}
              <button 
                type="button"
                onClick={(e) => { if (themeState === 'light') handleThemeToggle(e) }}
                className={`flex flex-col gap-2 rounded-2xl p-3 border-2 text-left bg-zinc-950 text-zinc-100 transition-all relative ${
                  themeState === 'dark' ? 'border-primary ring-2 ring-primary/10' : 'border-white/50 dark:border-zinc-800'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold">Oscuro</span>
                  {themeState === 'dark' && <span className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <div className="flex gap-1.5 mt-1">
                  <div className="w-5 h-5 rounded-full bg-[#3A875A]" />
                  <div className="w-5 h-5 rounded-full bg-zinc-900 border border-white/5" />
                  <div className="w-5 h-5 rounded-full bg-zinc-950 border border-white/5" />
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Security Warning Information */}
        <div className="flex gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-950 dark:text-amber-300">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <div className="space-y-1">
            <span className="text-xs font-bold block">Preferencia en tu cuenta</span>
            <p className="text-[11px] opacity-80 leading-relaxed font-medium">
              Tu tema preferido se guarda directamente en tu perfil de NutriPro. Esto significa que cuando inicies sesión desde cualquier otro dispositivo (móvil, tablet o pc), se aplicará automáticamente el mismo tema que elijas.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
