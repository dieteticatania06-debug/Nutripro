'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { useAuthStore } from '@/features/auth/store/authStore'
import { Logo } from './Logo'
import { cn, getAvatarUrl } from '@/lib/utils'
import { reviewsApi, profileApi } from '@/lib/api'
import type { Review, Profile } from '@nutripro/shared'
import {
  HelpCircle, Award, Target, Smartphone, MessageSquare,
  BarChart3, Heart, Dumbbell, Star, TrendingDown, Apple, Flame,
  Instagram, Mail, Copy, Check, Loader2, ChevronLeft, ChevronRight
} from 'lucide-react'

const TiktokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
)

const FrostingDividerTop = ({ className, fillColor = "rgba(255, 255, 255, 0.45)" }: { className?: string, fillColor?: string }) => (
  <div className={cn("absolute top-0 left-0 w-full overflow-hidden leading-[0] z-10 -mt-[47px]", className)}>
    <svg
      viewBox="0 0 1200 48"
      preserveAspectRatio="none"
      className="relative block w-full h-[48px]"
      style={{ fill: fillColor }}
    >
      <path d="M0,15 C80,5 120,45 200,25 C280,5 320,-5 400,15 C480,35 520,48 600,25 C680,2 720,18 800,12 C880,7 920,38 1000,28 C1080,18 1120,5 1200,18 L1200,48 L0,48 Z" />
    </svg>
  </div>
)

const FrostingDividerBottom = ({ className, fillColor = "rgba(255, 255, 255, 0.45)" }: { className?: string, fillColor?: string }) => (
  <div className={cn("absolute bottom-0 left-0 w-full overflow-hidden leading-[0] z-10 -mb-[47px] rotate-180", className)}>
    <svg
      viewBox="0 0 1200 48"
      preserveAspectRatio="none"
      className="relative block w-full h-[48px]"
      style={{ fill: fillColor }}
    >
      <path d="M0,15 C80,5 120,45 200,25 C280,5 320,-5 400,15 C480,35 520,48 600,25 C680,2 720,18 800,12 C880,7 920,38 1000,28 C1080,18 1120,5 1200,18 L1200,48 L0,48 Z" />
    </svg>
  </div>
)

const CurvedSectionBackground = ({ className, fillColor = "rgba(255, 255, 255, 0.4)" }: { className?: string, fillColor?: string }) => (
  <div className={cn("absolute inset-0 w-full h-full overflow-hidden leading-[0] z-0 pointer-events-none", className)}>
    <svg
      viewBox="0 0 1200 800"
      preserveAspectRatio="none"
      className="w-full h-full"
      style={{ fill: fillColor }}
    >
      <path d="M0,15 C80,5 120,45 200,25 C280,5 320,-5 400,15 C480,35 520,48 600,25 C680,2 720,18 800,12 C880,7 920,38 1000,28 C1080,18 1120,5 1200,18 L1200,782 C1120,795 1080,782 1000,772 C920,762 880,793 800,788 C720,782 680,798 600,775 C520,752 480,765 400,785 C320,805 280,795 200,775 C120,755 80,795 0,785 Z" />
    </svg>
  </div>
)



const benefits = [
  { icon: Target, title: 'Plan 100% Personalizado', desc: 'Cada dieta y rutina adaptada a tus objetivos, estilo de vida y preferencias.' },
  { icon: Smartphone, title: 'Seguimiento Online', desc: 'Accede a tu plan, registra tu progreso y comunícate con tu dietista desde cualquier lugar.' },
  { icon: MessageSquare, title: 'Soporte Continuo', desc: 'Chat directo con tu dietista para resolver dudas y mantener la motivación.' },
  { icon: BarChart3, title: 'Progreso Medible', desc: 'Gráficas y estadísticas detalladas para ver tu evolución semana a semana.' },
]

const steps = [
  { step: '1', title: 'Regístrate', desc: 'Crea tu cuenta gratuita en menos de 2 minutos.' },
  { step: '2', title: 'Completa el Cuestionario', desc: 'Cuéntanos tus objetivos, hábitos y preferencias alimenticias.' },
  { step: '3', title: 'Recibe tu Plan', desc: 'Tu dietista diseñará una dieta y rutina completamente personalizadas.' },
  { step: '4', title: 'Transforma tu Vida', desc: 'Sigue tu plan, registra avances y ajusta con el apoyo continuo de tu dietista.' },
]



const objectivesList = [
  {
    slug: 'perder-grasa',
    title: 'Perder Grasa',
    desc: 'Reduce porcentaje graso de forma gradual y sostenible, manteniendo tu masa muscular y tus niveles de energía.',
    icon: TrendingDown,
    image: '/photos/pexels-merve-205352359-13760156.webp',
    position: 'object-center',
  },
  {
    slug: 'comer-saludable',
    title: 'Comer más Saludable',
    desc: 'Adquiere hábitos sostenibles, organiza tus comidas diarias y mejora tu salud digestiva sin restricciones.',
    icon: Apple,
    image: '/photos/pexels-zeynep-264150158-32758334.webp',
    position: 'object-center',
  },
  {
    slug: 'ganar-musculo',
    title: 'Ganar Músculo',
    desc: 'Optimiza el aumento de masa magra con una pauta calórica adecuada y entrenamientos adaptados a hipertrofia.',
    icon: Dumbbell,
    image: '/photos/tyler-raye-eiAHNFufvDA-unsplash.webp',
    position: 'object-center',
  },
  {
    slug: 'rendimiento-deportivo',
    title: 'Mejorar Rendimiento',
    desc: 'Potencia tu rendimiento atlético, acelera la recuperación post-ejercicio y aumenta tus niveles de energía.',
    icon: Flame,
    image: '/photos/dmitrii-vaccinium-9qsK2QHidmg-unsplash.webp',
    position: 'object-center',
  },
]

const originalServices = [
  {
    icon: Heart,
    title: 'Nutrición Personalizada',
    desc: 'Plan de alimentación 100% adaptado a tus objetivos, gustos, alergias y estilo de vida.',
    iconBg: 'bg-sky-500/10',
    iconColor: 'text-sky-600',
    borderColor: 'border-sky-100',
    checkColor: 'text-sky-500',
    features: [
      'Evaluación nutricional completa',
      'Cuestionario detallado de hábitos',
      'Plan de dieta semanal personalizado',
      'Ajustes continuos según progreso',
      'Educación nutricional incluida'
    ]
  },
  {
    icon: BarChart3,
    title: 'Seguimiento y Progreso',
    desc: 'Monitorización continua de tu evolución con métricas reales y ajustes en tiempo real.',
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-600',
    borderColor: 'border-orange-100',
    checkColor: 'text-orange-500',
    features: [
      'Registro de peso y medidas',
      'Gráficas de evolución temporal',
      'Análisis de composición corporal',
      'Ajustes proactivos del plan',
      'Informes de progreso mensuales'
    ]
  },
  {
    icon: Dumbbell,
    title: 'Entrenamiento Complementario',
    desc: 'Rutinas deportivas diseñadas para potenciar los resultados de tu plan nutricional.',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-600',
    borderColor: 'border-green-100',
    checkColor: 'text-green-500',
    features: [
      'Rutina adaptada a tu nivel',
      'Compatible con tu horario',
      'Progresión gradual y segura',
      'Videos de ejercicios',
      'Ajustes cada 4-6 semanas'
    ]
  }
]

export function LandingView() {
  const { isAuthenticated, user } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  
  const blob1Ref = useRef<HTMLDivElement>(null)
  const blob2Ref = useRef<HTMLDivElement>(null)
  const blob3Ref = useRef<HTMLDivElement>(null)
  const blob4Ref = useRef<HTMLDivElement>(null)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [isEmailCopied, setIsEmailCopied] = useState(false)

  // Reviews states
  const [reviews, setReviews] = useState<Review[]>([])
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [clientProfile, setClientProfile] = useState<Profile | null>(null)

  // Carousel states
  const [currentIndex, setCurrentIndex] = useState(0)
  const [windowWidth, setWindowWidth] = useState(1200)
  const [isTransitioning, setIsTransitioning] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowWidth(window.innerWidth)
      const handleResize = () => setWindowWidth(window.innerWidth)
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  const visibleCount = windowWidth >= 1024 ? 3 : windowWidth >= 768 ? 2 : 1
  const isInfinite = reviews.length > visibleCount

  useEffect(() => {
    if (isInfinite) {
      setCurrentIndex(reviews.length)
    } else {
      setCurrentIndex(0)
    }
  }, [reviews.length, isInfinite])

  useEffect(() => {
    if (!isTransitioning) {
      const raf = requestAnimationFrame(() => {
        setIsTransitioning(true)
      })
      return () => cancelAnimationFrame(raf)
    }
  }, [isTransitioning])

  const nextReview = () => {
    if (isInfinite) {
      setIsTransitioning(true)
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const prevReview = () => {
    if (isInfinite) {
      setIsTransitioning(true)
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const handleTransitionEnd = () => {
    if (!isInfinite) return
    if (currentIndex >= reviews.length * 2) {
      setIsTransitioning(false)
      setCurrentIndex(currentIndex - reviews.length)
    } else if (currentIndex < reviews.length) {
      setIsTransitioning(false)
      setCurrentIndex(currentIndex + reviews.length)
    }
  }

  // Review modal form states
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [newRating, setNewRating] = useState<number>(0)
  const [newReviewContent, setNewReviewContent] = useState<string>('')
  const [submittingReview, setSubmittingReview] = useState(false)

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('dieteticatania06@gmail.com')
    setIsEmailCopied(true)
    toast({
      title: 'Email copiado',
      description: 'El correo electrónico ha sido copiado al portapapeles.',
    })
    setTimeout(() => setIsEmailCopied(false), 2000)
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    reviewsApi.list()
      .then((data) => {
        setReviews(data || [])
      })
      .catch((err) => {
        console.error('Error al cargar reseñas:', err)
      })
      .finally(() => {
        setLoadingReviews(false)
      })
  }, [])

  useEffect(() => {
    if (mounted && isAuthenticated && user) {
      profileApi.get()
        .then((data) => {
          setClientProfile(data)
        })
        .catch((err) => {
          console.error('Error al cargar perfil:', err)
        })
    } else {
      setClientProfile(null)
    }
  }, [mounted, isAuthenticated, user])

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newRating === 0) {
      toast({
        title: 'Selecciona una puntuación',
        description: 'Por favor, elige de 1 a 5 estrellas para valorar tu experiencia.',
        variant: 'destructive',
      })
      return
    }

    if (newReviewContent.trim().length < 5) {
      toast({
        title: 'Opinión demasiado corta',
        description: 'Por favor, escribe al menos 5 caracteres sobre tu experiencia.',
        variant: 'destructive',
      })
      return
    }

    setSubmittingReview(true)
    try {
      await reviewsApi.create({
        rating: newRating,
        content: newReviewContent.trim(),
      })

      toast({
        title: '¡Muchas gracias!',
        description: 'Tu valoración se ha publicado correctamente.',
      })

      // Refresh the list of reviews
      const updatedReviews = await reviewsApi.list()
      setReviews(updatedReviews || [])

      // Reset form and close modal
      setNewRating(0)
      setNewReviewContent('')
      setIsReviewModalOpen(false)
    } catch (err: any) {
      console.error('Error al enviar reseña:', err)
      toast({
        title: 'Error al publicar',
        description: err.message || 'No se pudo publicar la reseña. Inténtalo de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setSubmittingReview(false)
    }
  }

  useEffect(() => {
    let rAFId: number
    const handleScroll = () => {
      cancelAnimationFrame(rAFId)
      rAFId = requestAnimationFrame(() => {
        const sy = window.scrollY
        const isMobile = window.innerWidth < 768

        if (isMobile) {
          if (blob1Ref.current) blob1Ref.current.style.transform = 'none'
          if (blob2Ref.current) blob2Ref.current.style.transform = 'none'
          if (blob3Ref.current) blob3Ref.current.style.transform = 'none'
          if (blob4Ref.current) blob4Ref.current.style.transform = 'none'
          return
        }

        if (blob1Ref.current) {
          blob1Ref.current.style.transform = `translateY(${sy * 0.12}px) translateX(${sy * -0.04}px)`
        }
        if (blob2Ref.current) {
          blob2Ref.current.style.transform = `translateY(${sy * -0.08}px) translateX(${sy * 0.04}px) scale(${1 + sy * 0.00005})`
        }
        if (blob3Ref.current) {
          blob3Ref.current.style.transform = `translateY(${sy * 0.08}px)`
        }
        if (blob4Ref.current) {
          blob4Ref.current.style.transform = `translateY(${sy * -0.05}px) translateX(${sy * -0.03}px) scale(${Math.max(0.8, 1 - sy * 0.00005)})`
        }
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(rAFId)
    }
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.05,
        rootMargin: '0px 0px -40px 0px',
      }
    )

    const items = document.querySelectorAll('.reveal-item')
    items.forEach((item) => observer.observe(item))

    // Fallback: reveal items that are already in or above the viewport
    const revealVisibleItems = () => {
      const triggerBottom = window.innerHeight * 0.95
      items.forEach((item) => {
        if (!item.classList.contains('revealed')) {
          const rect = item.getBoundingClientRect()
          // If the element's top is above the trigger bottom line, it is visible or scrolled past
          if (rect.top < triggerBottom) {
            item.classList.add('revealed')
            observer.unobserve(item)
          }
        }
      })
    }

    // Run check immediately and with small delays to handle layout settle and scroll restoration
    revealVisibleItems()
    const timer1 = setTimeout(revealVisibleItems, 100)
    const timer2 = setTimeout(revealVisibleItems, 300)

    window.addEventListener('scroll', revealVisibleItems, { passive: true })
    window.addEventListener('resize', revealVisibleItems, { passive: true })

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      window.removeEventListener('scroll', revealVisibleItems)
      window.removeEventListener('resize', revealVisibleItems)
      items.forEach((item) => observer.unobserve(item))
    }
  }, [loadingReviews, reviews])

  // Pastel color palettes for loop rendering
  const pastelColors = [
    { bg: 'bg-sky-500/10 backdrop-blur-xl', border: 'border-sky-200/30', text: 'text-sky-950', iconBg: 'bg-sky-500/20', iconColor: 'text-sky-600' },
    { bg: 'bg-orange-500/10 backdrop-blur-xl', border: 'border-orange-200/30', text: 'text-orange-950', iconBg: 'bg-orange-500/20', iconColor: 'text-orange-600' },
    { bg: 'bg-green-500/10 backdrop-blur-xl', border: 'border-green-200/30', text: 'text-green-950', iconBg: 'bg-green-600/20', iconColor: 'text-green-600' },
    { bg: 'bg-purple-500/10 backdrop-blur-xl', border: 'border-purple-200/30', text: 'text-purple-950', iconBg: 'bg-purple-600/20', iconColor: 'text-purple-600' },
  ]

  const renderReviewCard = (r: Review) => {
    return (
      <div
        className="group rounded-[2rem] border border-white/50 bg-white/45 backdrop-blur-xl p-6 shadow-md shadow-orange-950/[0.01] hover:-translate-y-1.5 hover:scale-[1.01] hover:shadow-xl transition-all duration-300 flex flex-col justify-between w-full h-full text-left"
      >
        <div className="space-y-4">
          {/* Rating Stars */}
          <div className="flex gap-0.5 text-amber-500">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "w-4 h-4",
                  i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                )}
              />
            ))}
          </div>

          {/* Content */}
          <p className="text-sm text-foreground/80 leading-relaxed italic text-left">
            "{r.content}"
          </p>
        </div>

        {/* Author Profile */}
        <div className="flex items-center gap-3 pt-5 mt-4 border-t border-orange-100/10">
          <div className="relative w-9 h-9 rounded-full shrink-0 overflow-hidden border border-primary/10 bg-primary/10">
            <Image
              src={getAvatarUrl(r.avatarUrl, r.email ?? 'default')}
              alt={`${r.firstName}`}
              fill
              className="object-cover"
            />
          </div>
          <div className="text-left">
            <h4 className="font-sans font-bold text-xs text-[#2D1E1B]">
              {r.firstName} {r.lastName ? `${r.lastName[0]}.` : ''}
            </h4>
            <span className="text-[10px] text-muted-foreground">
              {new Date(r.createdAt).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#F5EBE1] via-[#FCF6F0] to-[#FAF3EC] text-foreground font-sans relative overflow-hidden">
      <PublicNavbar />

      {/* Floating Parallax Background Blobs */}
      <div
        ref={blob1Ref}
        className="fixed top-[-10%] right-[-10%] w-[650px] h-[650px] rounded-full bg-[#3A875A]/20 blur-[130px] pointer-events-none will-change-transform z-0"
      />
      <div
        ref={blob2Ref}
        className="fixed top-[30%] left-[-15%] w-[600px] h-[600px] rounded-full bg-orange-300/25 blur-[125px] pointer-events-none will-change-transform z-0"
      />
      <div
        ref={blob3Ref}
        className="fixed top-[60%] right-[-15%] w-[500px] h-[500px] rounded-full bg-[#3A875A]/15 blur-[110px] pointer-events-none will-change-transform z-0"
      />
      <div
        ref={blob4Ref}
        className="fixed bottom-[-5%] left-[-10%] w-[600px] h-[600px] rounded-full bg-orange-200/25 blur-[130px] pointer-events-none will-change-transform z-0"
      />

      {/* Hero */}
      <section className="relative pt-24 pb-16 px-4 md:px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-both">
          <div className="relative w-full rounded-[2.5rem] overflow-hidden shadow-2xl bg-[#1D1412] min-h-[500px] md:min-h-[600px] flex items-center justify-center px-6 md:px-12 py-16 md:py-24">
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-90"
              style={{
                backgroundImage: "url('/photos/pexels-arthousestudio-4589145.webp')",
                filter: 'brightness(0.85) contrast(1.05)'
              }}
            />

            {/* Dark Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-black/15 z-0" />

            {/* Social Icons (Top-Left) */}
            <div className="absolute top-6 left-6 md:top-8 md:left-8 z-20 hidden sm:flex flex-col gap-1.5 text-left">
              <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Contacto</span>
              <div className="flex gap-2">
                <a
                  href="https://www.instagram.com/nutripro65?igsh=MTlmM2ZsMWpyZDB5Nw=="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-white border border-white/15"
                  title="Instagram"
                >
                  <Instagram className="w-3.5 h-3.5" />
                </a>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    toast({
                      title: 'TikTok próximamente',
                      description: 'Nuestra cuenta de TikTok estará disponible muy pronto.',
                    })
                  }}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-white border border-white/15"
                  title="TikTok (Próximamente)"
                >
                  <TiktokIcon className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setIsEmailModalOpen(true)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-white border border-white/15 cursor-pointer"
                  title="Copiar email del dietista"
                >
                  <Mail className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto text-center space-y-8 relative z-10 text-white">
              <h1 className="text-4xl md:text-6xl font-bold font-serif leading-[1.15] text-white">
                Tu salud, transformada con<br />
                <span className="text-emerald-400">
                  nutrición personalizada
                </span>
              </h1>
              <p className="text-base md:text-lg text-white/80 max-w-xl mx-auto leading-relaxed font-semibold">
                Planes de alimentación y rutinas de ejercicio 100% adaptados a tus objetivos y estilo de vida.
                Seguimiento y soporte directo.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                {mounted && isAuthenticated && user ? (
                  <Button asChild size="lg" className="px-8 shadow-lg shadow-primary/20 hover:scale-[1.02] hover:shadow-primary/30 transition-all bg-primary text-white border-0">
                    <Link href={user.role === 'admin' ? '/admin' : '/dashboard'}>Mi Panel →</Link>
                  </Button>
                ) : (
                  <Button asChild size="lg" className="px-8 shadow-lg shadow-primary/20 hover:scale-[1.02] hover:shadow-primary/30 transition-all bg-primary text-white border-0">
                    <Link href="/auth/registro">Empieza tu transformación gratis →</Link>
                  </Button>
                )}
                <Button asChild variant="outline" size="lg" className="border-white/35 text-white hover:bg-white/10 hover:text-white px-8 hover:scale-[1.02] transition-all bg-white/5 backdrop-blur-sm">
                  <Link href="/precios">Ver planes y precios</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Benefits */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2 reveal-item">
            <span className="text-xs font-bold text-primary tracking-widest uppercase">Beneficios</span>
            <h2 className="text-3xl md:text-4xl font-bold font-serif text-[#2D1E1B]">¿Por qué elegir NutriPro?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b, index) => {
              const color = pastelColors[index % pastelColors.length]
              return (
                <div
                  key={b.title}
                  className={`reveal-item group rounded-[2rem] border ${color.border} ${color.bg} ${color.text} p-6 shadow-md shadow-orange-950/[0.01] hover:-translate-y-2 hover:scale-[1.03] hover:shadow-xl transition-all duration-500 flex flex-col items-center text-center space-y-4`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className={`w-14 h-14 rounded-full ${color.iconBg} flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                    <b.icon className={`w-7 h-7 ${color.iconColor}`} />
                  </div>
                  <h3 className="font-sans font-bold text-lg">{b.title}</h3>
                  <p className="text-sm opacity-80 leading-relaxed">{b.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-transparent relative">
        <CurvedSectionBackground />
        <div className="max-w-5xl mx-auto space-y-12 relative z-10">
          <div className="text-center space-y-2 reveal-item">
            <span className="text-xs font-bold text-primary tracking-widest uppercase">Proceso</span>
            <h2 className="text-3xl md:text-4xl font-bold font-serif text-[#2D1E1B]">Cómo Funciona</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, index) => (
              <div
                key={s.step}
                className="reveal-item text-center space-y-4 relative group hover:-translate-y-1.5 transition-all duration-300"
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center font-serif font-black text-xl mx-auto shadow-md shadow-primary/20 group-hover:scale-110 transition-transform">
                  {s.step}
                </div>
                <h3 className="font-sans font-bold text-lg text-[#2D1E1B]">{s.title}</h3>
                <p className="text-sm text-foreground/70 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Objectives Section */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2 reveal-item">
            <span className="text-xs font-bold text-primary tracking-widest uppercase">Metas</span>
            <h2 className="text-3xl md:text-4xl font-bold font-serif text-[#2D1E1B]">Elige tu Objetivo</h2>
            <p className="text-foreground/75 max-w-xl mx-auto">
              Haz clic en tu meta principal para descubrir cómo NutriPro personaliza tu plan nutricional y tu entrenamiento.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {objectivesList.map((obj, index) => {
              const color = pastelColors[index % pastelColors.length]
              return (
                <Link
                  key={obj.slug}
                  href={`/objetivos/${obj.slug}`}
                  className="reveal-item group rounded-[2.5rem] shadow-md shadow-orange-950/[0.01] hover:shadow-xl hover:-translate-y-2 transition-all duration-500 flex flex-col h-[380px] cursor-pointer relative"
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  {/* Inner clipping container to prevent corner overflow bug during transition */}
                  <div
                    className="absolute inset-0 rounded-[2.5rem] border border-white/20 overflow-hidden flex flex-col h-full w-full isolate"
                    style={{
                      WebkitMaskImage: "-webkit-radial-gradient(white, black)",
                      maskImage: "radial-gradient(white, black)",
                    }}
                  >
                    {/* Background Image */}
                    <div className="absolute inset-0 overflow-hidden z-0">
                      <Image
                        src={obj.image}
                        alt={obj.title}
                        fill
                        className={cn(
                          "object-cover group-hover:scale-110 transition-transform duration-500",
                          obj.position || "object-center"
                        )}
                        sizes="(max-width: 768px) 100vw, 25vw"
                      />
                    </div>

                    {/* Icon floating on top left */}
                    <div className={`absolute top-4 left-4 w-11 h-11 rounded-2xl ${color.iconBg} backdrop-blur-md border border-white/35 flex items-center justify-center shadow-md z-10`}>
                      <obj.icon className={`w-5 h-5 ${color.iconColor}`} />
                    </div>

                    {/* Blurred Bottom Text Overlay */}
                    <div className="p-5 bg-black/45 backdrop-blur-md border-t border-white/10 text-left z-10 w-full mt-auto flex flex-col justify-between h-[180px] rounded-b-[2.5rem]">
                      <div className="space-y-1.5">
                        <h3 className="font-serif font-bold text-lg text-white">{obj.title}</h3>
                        <p className="text-[11px] text-white/80 leading-relaxed line-clamp-3">{obj.desc}</p>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1.5 transition-transform mt-2">
                        Saber más →
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Sobre Mí Section */}
      <section id="sobre-mi" className="py-20 px-4 bg-transparent relative scroll-mt-16">
        <CurvedSectionBackground />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-12 space-y-2 reveal-item">
            <span className="text-xs font-bold text-primary tracking-widest uppercase">Tu Profesional</span>
            <h2 className="text-3xl md:text-4xl font-bold font-serif text-[#2D1E1B]">Sobre Mí</h2>
          </div>
          <div className="reveal-item grid grid-cols-1 md:grid-cols-3 gap-0 overflow-hidden bg-white/45 backdrop-blur-xl rounded-[2.5rem] border border-white/50 shadow-xl shadow-orange-950/[0.01] hover:shadow-2xl hover:shadow-orange-950/5 hover:-translate-y-1 transition-all duration-500">
            <div className="md:col-span-1 relative w-full h-[320px] md:h-auto min-h-[320px] md:min-h-[380px]">
              <Image
                src="/photos/dietista.webp"
                alt="Dietista"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
                priority
              />
            </div>
            <div className="md:col-span-2 p-8 md:p-10 flex flex-col justify-center space-y-6">
              <div className="space-y-3">
                <h4 className="font-sans font-bold text-primary flex items-center gap-2 text-base">
                  <Award className="w-5 h-5 animate-pulse" /> Mi Historia
                </h4>
                <p className="text-foreground/80 text-sm leading-relaxed">
                  Acabo de obtener mi título de Técnica Superior en Dietética y estoy muy emocionada por empezar a ayudarte a alcanzar tus objetivos de bienestar. Siempre me ha apasionado cómo la nutrición influye en nuestra energía, salud y estado de ánimo, y decidí lanzar este espacio para ofrecer un acompañamiento verdaderamente cercano y adaptado a ti.
                </p>
                <p className="text-foreground/80 text-sm leading-relaxed">
                  Al haber finalizado mis estudios recientemente, tengo los conocimientos científicos más actualizados y muchas ganas de aplicarlos para facilitarte el camino. Mi meta es guiarte paso a paso de una forma sencilla, realista y sin complicaciones.
                </p>
              </div>
              <div className="space-y-3 border-t border-orange-100/20 pt-6">
                <h4 className="font-sans font-bold text-primary flex items-center gap-2 text-base">
                  <Heart className="w-5 h-5 animate-pulse" /> Mi Filosofía
                </h4>
                <p className="text-foreground/80 text-sm leading-relaxed">
                  No creo en las dietas extremas ni en la rigidez que genera ansiedad. Pienso que aprender a comer bien debe ser un proceso agradable, que encaje de forma natural con tu vida familiar, laboral y social. Mi enfoque combina educación nutricional práctica y total flexibilidad: no hay alimentos prohibidos, sino hábitos equilibrados construidos a tu ritmo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Servicios Section */}
      <section id="servicios" className="py-20 px-4 scroll-mt-16">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2 reveal-item">
            <span className="text-xs font-bold text-primary tracking-widest uppercase">Servicios</span>
            <h2 className="text-3xl md:text-4xl font-bold font-serif text-[#2D1E1B]">Nuestros Servicios</h2>
            <p className="text-foreground/75 max-w-xl mx-auto">
              Un enfoque integral que combina nutrición, seguimiento y entrenamiento para potenciar tu cambio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {originalServices.map((service, index) => {
              const Icon = service.icon
              return (
                <div
                  key={service.title}
                  className="reveal-item rounded-[2.5rem] bg-white/45 backdrop-blur-xl border border-white/50 p-8 flex flex-col space-y-6 shadow-xl shadow-orange-950/[0.01] hover:shadow-2xl hover:shadow-orange-950/5 hover:-translate-y-1.5 transition-all duration-500"
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0", service.iconBg)}>
                    <Icon className={cn("w-7 h-7", service.iconColor)} />
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-serif font-bold text-xl text-[#2D1E1B]">
                      {service.title}
                    </h3>
                    <p className="text-sm text-foreground/75 leading-relaxed">
                      {service.desc}
                    </p>
                  </div>

                  <ul className="space-y-3 pt-2 border-t border-orange-100/10 flex-grow">
                    {service.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2.5 text-sm text-foreground/80 leading-snug">
                        <span className="text-[#3A875A] shrink-0 font-bold">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>
      {/* Testimonials */}
      <section className="pt-20 pb-32 px-4 relative z-20">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2 reveal-item">
            <span className="text-xs font-bold text-primary tracking-widest uppercase">Opiniones</span>
            <h2 className="text-3xl md:text-4xl font-bold font-serif text-[#2D1E1B]">Lo que dicen nuestros clientes</h2>
            {mounted && isAuthenticated && reviews.length > 0 && (
              <div className="pt-2">
                <Button
                  onClick={() => setIsReviewModalOpen(true)}
                  className="rounded-full shadow-md bg-primary hover:bg-primary/95 text-white border-0 text-xs font-semibold px-5 py-2 hover:scale-[1.02] transition-all"
                >
                  <Star className="w-3.5 h-3.5 mr-1.5 fill-white/20 text-white" /> Escribir mi opinión
                </Button>
              </div>
            )}
          </div>

          {loadingReviews ? (
            // Loading skeleton
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="reveal-item bg-white/30 backdrop-blur-md rounded-[2rem] border border-white/40 p-6 space-y-4 animate-pulse">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <div key={s} className="w-4 h-4 rounded bg-muted/60" />
                    ))}
                  </div>
                  <div className="h-4 bg-muted/60 rounded w-full" />
                  <div className="h-4 bg-muted/60 rounded w-5/6" />
                  <div className="flex items-center gap-3 pt-2">
                    <div className="w-9 h-9 rounded-full bg-muted/60" />
                    <div className="space-y-1">
                      <div className="h-3 bg-muted/60 rounded w-20" />
                      <div className="h-2 bg-muted/40 rounded w-12" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            // Empty state
            <div className="flex justify-center">
              <div className="reveal-item max-w-md w-full bg-white/45 backdrop-blur-xl rounded-[2.5rem] border border-white/50 p-8 shadow-xl shadow-orange-950/[0.01] text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                  <Star className="w-6 h-6 fill-primary/20" />
                </div>
                <h3 className="font-sans font-bold text-lg text-[#2D1E1B]">Sin valoraciones todavía</h3>
                <p className="text-sm text-foreground/75 leading-relaxed">
                  ¡Sé uno de los primeros en comenzar tu cambio y compartir tu experiencia con nosotros!
                </p>
                {mounted && isAuthenticated && (
                  <div className="pt-2">
                    <Button
                      onClick={() => setIsReviewModalOpen(true)}
                      className="rounded-full shadow-md bg-primary hover:bg-primary/95 text-white border-0 text-xs font-semibold px-5 py-2"
                    >
                      Escribir la primera reseña
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Dynamic Carousel Slider
            <div className="relative px-2 sm:px-12">
              {!mounted ? (
                // Static grid for SSR / Initial load (avoids layout shift and hydration mismatch)
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {reviews.slice(0, 3).map((r) => (
                    <div key={r.id} className="h-full">
                      {renderReviewCard(r)}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* Slider Container */}
                  <div className="overflow-hidden w-full py-8 px-2">
                    {(() => {
                      const extendedReviews = isInfinite
                        ? [...reviews, ...reviews, ...reviews]
                        : reviews;
                      return (
                        <div
                          className={cn(
                            "flex",
                            reviews.length <= visibleCount && "justify-center"
                          )}
                          style={{
                            transform: `translateX(-${currentIndex * (100 / extendedReviews.length)}%)`,
                            width: `${(extendedReviews.length / visibleCount) * 100}%`,
                            transition: isTransitioning ? 'transform 500ms ease-in-out' : 'none'
                          }}
                          onTransitionEnd={handleTransitionEnd}
                        >
                          {extendedReviews.map((r, idx) => (
                            <div
                              key={`${r.id}-${idx}`}
                              style={{ width: `${100 / extendedReviews.length}%` }}
                              className="shrink-0 px-3 flex"
                            >
                              {renderReviewCard(r)}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Navigation Arrows */}
                  {reviews.length > visibleCount && (
                    <>
                      <button
                        onClick={prevReview}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:translate-x-0 w-11 h-11 rounded-full border border-white/50 bg-white/70 backdrop-blur-md shadow-md text-primary hover:bg-primary hover:text-white hover:border-transparent transition-all flex items-center justify-center cursor-pointer z-20 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        aria-label="Opinión anterior"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={nextReview}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-0 w-11 h-11 rounded-full border border-white/50 bg-white/70 backdrop-blur-md shadow-md text-primary hover:bg-primary hover:text-white hover:border-transparent transition-all flex items-center justify-center cursor-pointer z-20 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        aria-label="Siguiente opinión"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#F5EBE1] py-16 px-4 relative z-10">
        <FrostingDividerTop fillColor="#F5EBE1" />
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 text-sm text-foreground/80">
          <div className="space-y-4">
            <Link href="/">
              <Logo showText={true} textClassName="text-xl" />
            </Link>
            <p className="text-xs text-[#2D1E1B]/60 leading-relaxed">
              Planes de nutrición y entrenamiento 100% personalizados basados en la ciencia y en tus hábitos reales.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#2D1E1B]/60">Nosotros</h4>
            <div className="flex flex-col gap-2.5">
              <Link href="/#sobre-mi" className="hover:text-primary transition-colors text-xs font-semibold">Quiénes Somos</Link>
              <Link href="/#servicios" className="hover:text-primary transition-colors text-xs font-semibold">Nuestros Métodos</Link>
              <Link href="/precios" className="hover:text-primary transition-colors text-xs font-semibold">Planes y Precios</Link>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#2D1E1B]/60">Legal</h4>
            <div className="flex flex-col gap-2.5">
              <Link href="/legal/privacidad" className="hover:text-primary transition-colors text-xs font-semibold">Privacidad</Link>
              <Link href="/legal/cookies" className="hover:text-primary transition-colors text-xs font-semibold">Cookies</Link>
              <Link href="/legal/terminos" className="hover:text-primary transition-colors text-xs font-semibold">Términos de Servicio</Link>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#2D1E1B]/60">Contacto</h4>
            <div className="flex flex-col gap-2.5 text-xs font-semibold">
              <p>Málaga, España</p>
              <p>dieteticatania06@gmail.com</p>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto border-t border-orange-100/20 mt-12 pt-8 flex flex-col items-center gap-3 text-center text-xs text-[#2D1E1B]/50 font-medium">
          <p className="text-[#2D1E1B]/60 max-w-lg leading-relaxed">
            Nutrición profesional para todos. Consigue tus objetivos de forma sostenible y saludable con NutriPro. Únete gratis para obtener tu plan de nutrición personalizado y alcanzar tus metas saludables.
          </p>
          <span>© {new Date().getFullYear()} NutriPro. Todos los derechos reservados.</span>
        </div>
      </footer>

      {/* Email Copy Modal */}
      {mounted && isEmailModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl max-w-sm w-full rounded-[2rem] shadow-2xl border border-orange-100/60 p-6 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-extrabold text-base text-[#2D1E1B]">Email de Contacto</h3>
                <p className="text-xs text-muted-foreground">Escribe directamente a tu dietista</p>
              </div>
            </div>

            <div className="bg-muted/40 border border-muted/70 rounded-2xl p-4 flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-foreground select-all truncate">
                dieteticatania06@gmail.com
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleCopyEmail}
                className="shrink-0 h-8 w-8 text-muted-foreground hover:text-primary rounded-xl"
                title="Copiar email"
              >
                {isEmailCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEmailModalOpen(false)}
                className="rounded-full text-xs font-semibold px-4"
              >
                Cerrar
              </Button>
              <Button
                size="sm"
                onClick={handleCopyEmail}
                className="rounded-full text-xs font-semibold px-4"
              >
                {isEmailCopied ? '¡Copiado!' : 'Copiar email'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Review Modal */}
      {mounted && isReviewModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl max-w-md w-full rounded-[2.5rem] shadow-2xl border border-orange-100/60 p-6 md:p-8 animate-in zoom-in-95 duration-200 space-y-6">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1 text-left">
                <h3 className="font-serif font-extrabold text-xl text-[#2D1E1B]">
                  {clientProfile ? `¡Hola, ${clientProfile.firstName}!` : 'Tu opinión nos importa'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Comparte tu experiencia con NutriPro y ayúdanos a mejorar.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsReviewModalOpen(false)}
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-5 text-left">
              {/* Star Rating Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground/80 block">
                  ¿Cómo valorarías tu experiencia?
                </label>
                <div className="flex gap-2 py-1 items-center justify-center md:justify-start">
                  {[1, 2, 3, 4, 5].map((starIndex) => {
                    const ratingValue = starIndex
                    const isFilled = ratingValue <= newRating
                    return (
                      <button
                        key={starIndex}
                        type="button"
                        onClick={() => setNewRating(ratingValue)}
                        className="p-1 cursor-pointer bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none transition-all duration-150 active:scale-95"
                        title={`Valorar con ${ratingValue} estrellas`}
                      >
                        <Star
                          className={cn(
                            "w-8 h-8 transition-all duration-150",
                            isFilled
                              ? "fill-amber-400 text-amber-400 scale-110"
                              : "text-muted-foreground/30 hover:text-amber-400/50"
                          )}
                        />
                      </button>
                    )
                  })}
                  {newRating > 0 && (
                    <span className="text-xs font-semibold text-amber-600 ml-2 animate-in fade-in duration-200">
                      {newRating} {newRating === 1 ? 'estrella' : 'estrellas'}
                    </span>
                  )}
                </div>
              </div>

              {/* Textarea for Content */}
              <div className="space-y-1.5">
                <label htmlFor="reviewContent" className="text-xs font-bold text-foreground/80 block">
                  Escribe tu reseña
                </label>
                <textarea
                  id="reviewContent"
                  rows={4}
                  maxLength={1000}
                  placeholder="Cuéntanos tus resultados, qué cambios has notado, tu relación con las comidas..."
                  value={newReviewContent}
                  onChange={(e) => setNewReviewContent(e.target.value)}
                  className="w-full text-sm rounded-2xl border border-orange-100 bg-white/90 p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none placeholder:text-muted-foreground/50"
                  required
                />
                <div className="flex justify-between items-center text-[10px] text-muted-foreground/80 px-1">
                  <span>Mínimo 5 caracteres</span>
                  <span>{newReviewContent.length} / 1000</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={submittingReview}
                  onClick={() => setIsReviewModalOpen(false)}
                  className="rounded-full text-xs font-semibold px-5"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingReview}
                  className="rounded-full text-xs font-semibold px-6 shadow-md shadow-primary/10 hover:shadow-primary/25 transition-all bg-primary text-white border-0"
                >
                  {submittingReview ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Publicando...
                    </>
                  ) : (
                    'Publicar opinión'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
