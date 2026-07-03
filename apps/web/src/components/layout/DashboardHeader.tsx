'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu, User, LogOut, Settings, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store/authStore'
import { profileApi } from '@/lib/api'
import { Logo } from './Logo'
import type { Profile } from '@nutripro/shared'
import { Button } from '@/components/ui/button'
import { getInitials, getAvatarUrl } from '@/lib/utils'
import Image from 'next/image'
import { toast } from '@/hooks/use-toast'
import { create } from 'zustand'

interface SidebarState {
  isOpen: boolean
  toggle: () => void
  setOpen: (open: boolean) => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: false,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (isOpen) => set({ isOpen }),
}))

export function DashboardHeader() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { toggle } = useSidebarStore()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    profileApi.get()
      .then((p) => setProfile(p))
      .catch(() => {})
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setDropdownOpen(false)
    await logout()
    toast({ title: 'Sesión cerrada', description: 'Hasta pronto' })
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between bg-transparent border-0 border-transparent shadow-none px-4 sm:px-6 lg:px-8">
      {/* Left: Mobile Toggle & Logo */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden rounded-full hover:bg-primary/5 hover:text-primary"
          onClick={toggle}
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="lg:hidden flex items-center">
          <Link href="/dashboard">
            <Logo className="w-6 h-6" showText={true} textColorClass="text-foreground" />
          </Link>
        </div>
      </div>

      {/* Right: User Menu */}
      <div className="flex items-center gap-4 ml-auto">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-full p-1.5 hover:bg-white/60 hover:backdrop-blur-md hover:shadow-sm border border-transparent hover:border-white/40 transition-all focus:outline-none"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div className="relative h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20">
              <Image
                src={getAvatarUrl(profile?.avatarUrl, user?.email ?? 'default')}
                alt="Avatar"
                fill
                sizes="32px"
                className="object-cover"
              />
            </div>
            <span className="hidden md:block text-sm font-semibold text-foreground/80">
              {profile ? `${profile.firstName} ${profile.lastName}` : 'Usuario'}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-white/60 bg-[#FAF3EC]/85 backdrop-blur-xl p-2 shadow-2xl shadow-black/10 focus:outline-none z-50">
              <div className="px-3 py-2 border-b border-orange-50 mb-1">
                <p className="text-sm font-bold text-foreground truncate">
                  {profile ? `${profile.firstName} ${profile.lastName}` : 'Usuario'}
                </p>
                <p className="text-xs text-foreground/60 truncate mt-0.5">{user?.email}</p>
              </div>
              <div className="space-y-0.5">
                <Link
                  href="/dashboard/perfil"
                  onClick={() => setDropdownOpen(false)}
                  className="flex w-full items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-foreground/85 hover:bg-primary/5 hover:text-primary transition-all"
                >
                  <User className="h-4.5 w-4.5" />
                  Mi Perfil
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-destructive hover:bg-destructive/5 transition-all"
                >
                  <LogOut className="h-4.5 w-4.5" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
