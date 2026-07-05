'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/store/authStore'
import { Menu, X } from 'lucide-react'
import { Logo } from './Logo'

export function PublicNavbar() {
  const { isAuthenticated, user, logout, fetchMe } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)
  const [translateY, setTranslateY] = useState(0)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  // On mount, if localStorage says we're authenticated, verify the session
  // is still valid with the backend. If not (stale token / DB reset), fetchMe
  // will call clear() and the navbar will update to the unauthenticated state.
  useEffect(() => {
    if (isAuthenticated) {
      fetchMe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run only once on mount — we intentionally don't re-run on isAuthenticated changes

  useEffect(() => {
    let timeoutId: any
    let lastScrollY = window.scrollY

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      setIsScrolling(true)

      const diff = Math.min(Math.max((currentScrollY - lastScrollY) * 0.15, -15), 15)
      setTranslateY(diff)

      lastScrollY = currentScrollY

      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        setIsScrolling(false)
        setTranslateY(0)
      }, 150)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.clearTimeout(timeoutId)
    }
  }, [])

  const handleLogout = async () => {
    await logout()
    setMobileMenuOpen(false)
    router.push('/')
  }

  const renderLeftSide = () => {
    return (
      <div className="hidden md:flex items-center justify-start gap-8 text-sm font-semibold">
        <Link href="/#sobre-mi" className="relative py-1 text-[#2D1E1B]/75 hover:text-primary transition-colors after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-primary after:transition-all after:duration-300">Sobre mí</Link>
        <Link href="/#servicios" className="relative py-1 text-[#2D1E1B]/75 hover:text-primary transition-colors after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-primary after:transition-all after:duration-300">Servicios</Link>
      </div>
    )
  }

  const renderCenter = () => {
    return (
      <div className="flex items-center md:justify-center">
        <Link href="/">
          <Logo showText={true} />
        </Link>
      </div>
    )
  }

  const renderRightSide = () => {
    if (!mounted) {
      return (
        <div className="hidden md:flex items-center justify-end gap-8 text-sm font-semibold">
          <Link href="/precios" className="relative py-1 text-[#2D1E1B]/75 hover:text-primary transition-colors after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-primary after:transition-all after:duration-300">Precios</Link>
          <div className="w-16" />
        </div>
      )
    }

    if (isAuthenticated && user) {
      const dashboardUrl = user.role === 'admin' ? '/admin' : '/dashboard'
      return (
        <div className="hidden md:flex items-center justify-end gap-6 text-sm font-semibold">
          <Link href="/precios" className="relative py-1 text-[#2D1E1B]/75 hover:text-primary transition-colors after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-primary after:transition-all after:duration-300">Precios</Link>
          <Link href={dashboardUrl} className="relative py-1 text-[#2D1E1B]/75 hover:text-primary transition-colors after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-primary after:transition-all after:duration-300">Mi Panel</Link>
          <button 
            onClick={handleLogout} 
            className="bg-[#2D1E1B]/5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 text-[#2D1E1B] border border-[#2D1E1B]/10 px-4 py-1.5 rounded-full text-xs font-bold hover:scale-[1.03] transition-all duration-300"
          >
            Salir
          </button>
        </div>
      )
    }

    return (
      <div className="hidden md:flex items-center justify-end gap-6 text-sm font-semibold">
        <Link href="/precios" className="relative py-1 text-[#2D1E1B]/75 hover:text-primary transition-colors after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-primary after:transition-all after:duration-300">Precios</Link>
        <Link href="/auth/login" className="relative py-1 text-[#2D1E1B]/75 hover:text-primary transition-colors after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-primary after:transition-all after:duration-300">Iniciar Sesión</Link>
        <Link 
          href="/auth/registro" 
          className="bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-full text-xs font-bold hover:scale-[1.05] hover:shadow-lg hover:shadow-primary/25 transition-all duration-300"
        >
          Registro
        </Link>
      </div>
    )
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 w-full max-w-4xl mx-auto px-4 pt-4 bg-transparent">
      <div 
        style={{
          transform: `translateY(${-translateY}px)`,
          transition: isScrolling ? 'transform 0.08s ease-out' : 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.4)',
        }}
        className="bg-white/30 backdrop-blur-xl text-[#2D1E1B] rounded-full px-6 py-3 flex items-center justify-between md:grid md:grid-cols-3 shadow-lg shadow-orange-950/5 border border-white/50 hover:border-primary/25 transition-all duration-500 relative"
      >
        
        {/* Left Links */}
        {renderLeftSide()}
 
        {/* Center Logo */}
        {renderCenter()}
 
        {/* Right Links / Actions */}
        <div className="flex items-center justify-end gap-6">
          {renderRightSide()}
 
          {/* Mobile menu trigger */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="md:hidden text-[#2D1E1B] hover:text-primary transition-colors"
            aria-label="Menú de navegación"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
 
        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="absolute left-0 right-0 top-[60px] mx-4 bg-white/90 backdrop-blur-2xl border border-white/50 rounded-3xl p-6 shadow-2xl z-50 flex flex-col gap-4 text-center md:hidden">
            <Link 
              href="/#sobre-mi" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#2D1E1B]/80 hover:text-primary font-semibold text-sm py-2"
            >
              Sobre mí
            </Link>
            <Link 
              href="/#servicios" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#2D1E1B]/80 hover:text-primary font-semibold text-sm py-2"
            >
              Servicios
            </Link>
            <Link 
              href="/precios" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#2D1E1B]/80 hover:text-primary font-semibold text-sm py-2"
            >
              Precios
            </Link>

            
            <hr className="border-[#2D1E1B]/10 my-1" />
 
            {mounted && isAuthenticated && user ? (
              <>
                <Link 
                  href={user.role === 'admin' ? '/admin' : '/dashboard'} 
                  onClick={() => setMobileMenuOpen(false)}
                  className="bg-primary text-white py-2 rounded-full font-bold text-xs"
                >
                  Mi Panel
                </Link>
                <button 
                  onClick={handleLogout}
                  className="bg-[#2D1E1B]/5 text-[#2D1E1B] py-2 rounded-full font-bold text-xs border border-[#2D1E1B]/10"
                >
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/auth/login" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[#2D1E1B]/80 hover:text-primary font-semibold text-sm py-2"
                >
                  Iniciar Sesión
                </Link>
                <Link 
                  href="/auth/registro" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="bg-primary text-white py-2 rounded-full font-bold text-xs"
                >
                  Registro Gratis
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
