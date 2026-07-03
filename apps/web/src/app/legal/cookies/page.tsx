import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/layout/Logo'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Política de Cookies | NutriPro' }

export default function CookiesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#F5EBE1] via-[#FCF6F0] to-[#FAF3EC] text-foreground font-sans relative overflow-hidden">
      {/* Floating Background Blobs */}
      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#3A875A]/25 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="fixed bottom-[-10%] left-[-10%] w-[550px] h-[550px] rounded-full bg-orange-300/20 blur-[130px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />

      <PublicNavbar />
      
      <div className="max-w-3xl mx-auto pt-28 pb-16 px-4 space-y-8 flex-grow relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        {/* Back button */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-foreground/75 hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver al inicio
        </Link>

        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#2D1E1B] font-serif">Política de Cookies</h1>
          <p className="text-muted-foreground text-xs font-semibold">Última actualización: 22 de junio de 2026</p>
        </div>

        <div className="bg-white/45 backdrop-blur-xl border border-white/40 rounded-[2rem] p-8 shadow-xl space-y-6 text-sm text-foreground/80 leading-relaxed font-medium">
          <section className="space-y-2.5">
            <h2 className="text-lg font-bold text-[#2D1E1B]">1. ¿Qué son las cookies?</h2>
            <p>
              Las cookies son pequeños archivos de texto que los sitios web almacenan en tu dispositivo (ordenador, tablet o smartphone) al visitarlos. Se utilizan para que la plataforma funcione correctamente, recuerde tus preferencias y mejore tu experiencia de navegación.
            </p>
          </section>

          <section className="space-y-2.5">
            <h2 className="text-lg font-bold text-[#2D1E1B]">2. ¿Cómo las utilizamos en NutriPro?</h2>
            <p>
              NutriPro utiliza únicamente cookies de carácter técnico y funcional indispensables para ofrecerte nuestros servicios:
            </p>
            <ul className="list-disc list-inside pl-2 space-y-1 text-xs">
              <li><strong>Cookies de sesión y autenticación:</strong> Te permiten iniciar sesión de forma segura y acceder a tu panel de control personalizado sin tener que reintroducir tus credenciales constantemente.</li>
              <li><strong>Cookies de preferencias:</strong> Recuerdan detalles como la configuración de idioma o si has aceptado nuestro aviso sobre cookies.</li>
            </ul>
            <p className="pt-1">
              No utilizamos cookies publicitarias o de rastreo de terceros para marketing o anuncios dirigidos.
            </p>
          </section>

          <section className="space-y-2.5">
            <h2 className="text-lg font-bold text-[#2D1E1B]">3. Controlar y borrar cookies</h2>
            <p>
              Puedes permitir, bloquear o eliminar las cookies instaladas en tu equipo configurando las opciones del navegador que utilices en tu dispositivo. Ten en cuenta que si desactivas las cookies técnicas necesarias, es posible que no puedas acceder a ciertas funcionalidades de la plataforma o que la sesión del panel de cliente no se mantenga iniciada.
            </p>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/30 py-8 px-4 bg-white/20 backdrop-blur-md relative z-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-medium">
          <Link href="/">
            <Logo showText={true} textClassName="text-sm font-black" className="w-6 h-6" />
          </Link>
          <div className="flex gap-4 font-semibold">
            <Link href="/legal/privacidad" className="hover:text-primary transition-colors">Privacidad</Link>
            <Link href="/legal/cookies" className="hover:text-primary transition-colors text-primary">Cookies</Link>
            <Link href="/legal/terminos" className="hover:text-primary transition-colors">Términos</Link>
            <a href="mailto:dieteticatania06@gmail.com" className="hover:text-primary transition-colors">Contacto</a>
          </div>
          <span>© {new Date().getFullYear()} NutriPro. Todos los derechos reservados.</span>
        </div>
      </footer>
    </div>
  )
}
