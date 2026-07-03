import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/layout/Logo'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Política de Privacidad | NutriPro' }

export default function PrivacidadPage() {
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
          <h1 className="text-4xl font-extrabold tracking-tight text-[#2D1E1B] font-serif">Política de Privacidad</h1>
          <p className="text-muted-foreground text-xs font-semibold">Última actualización: 22 de junio de 2026</p>
        </div>

        <div className="bg-white/45 backdrop-blur-xl border border-white/40 rounded-[2rem] p-8 shadow-xl space-y-6 text-sm text-foreground/80 leading-relaxed font-medium">
          <section className="space-y-2.5">
            <h2 className="text-lg font-bold text-[#2D1E1B]">1. Información que recopilamos</h2>
            <p>
              En NutriPro, recopilamos información personal relevante que nos proporcionas directamente para poder brindarte nuestros servicios de nutrición y asesoramiento deportivo. Esta información incluye:
            </p>
            <ul className="list-disc list-inside pl-2 space-y-1 text-xs">
              <li>Datos de contacto (nombre, apellidos, correo electrónico).</li>
              <li>Datos físicos e información nutricional (fecha de nacimiento, peso, altura, hábitos alimenticios y de entrenamiento).</li>
              <li>Observaciones o condiciones médicas relevantes proporcionadas en el cuestionario de salud.</li>
            </ul>
          </section>

          <section className="space-y-2.5">
            <h2 className="text-lg font-bold text-[#2D1E1B]">2. Uso de tus datos</h2>
            <p>
              Utilizamos la información recopilada únicamente para los siguientes propósitos:
            </p>
            <ul className="list-disc list-inside pl-2 space-y-1 text-xs">
              <li>Elaborar y adaptar tus planes personalizados de alimentación y entrenamiento.</li>
              <li>Gestionar y confirmar tus citas de asesoramiento.</li>
              <li>Facilitar la comunicación directa con tu dietista asignada a través del chat de la plataforma.</li>
              <li>Enviarte alertas o recordatorios importantes del servicio.</li>
            </ul>
          </section>

          <section className="space-y-2.5">
            <h2 className="text-lg font-bold text-[#2D1E1B]">3. Conservación y seguridad</h2>
            <p>
              Tus datos son almacenados en servidores seguros y solo son accesibles por tu dietista autorizada. No compartimos, vendemos ni cedemos tu información personal a terceros bajo ninguna circunstancia, excepto cuando sea legalmente requerido. Conservamos tus datos únicamente mientras mantengas tu cuenta activa o para cumplir con obligaciones regulatorias médicas.
            </p>
          </section>

          <section className="space-y-2.5">
            <h2 className="text-lg font-bold text-[#2D1E1B]">4. Tus derechos</h2>
            <p>
              Tienes derecho a acceder, rectificar, limitar el tratamiento o solicitar la eliminación total de tus datos personales en cualquier momento. Para ejercer estos derechos o realizar consultas sobre privacidad, puedes ponerte en contacto con nosotros escribiendo a <a href="mailto:dieteticatania06@gmail.com" className="text-primary hover:underline font-bold">dieteticatania06@gmail.com</a>.
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
            <Link href="/legal/privacidad" className="hover:text-primary transition-colors text-primary">Privacidad</Link>
            <Link href="/legal/cookies" className="hover:text-primary transition-colors">Cookies</Link>
            <Link href="/legal/terminos" className="hover:text-primary transition-colors">Términos</Link>
            <a href="mailto:dieteticatania06@gmail.com" className="hover:text-primary transition-colors">Contacto</a>
          </div>
          <span>© {new Date().getFullYear()} NutriPro. Todos los derechos reservados.</span>
        </div>
      </footer>
    </div>
  )
}
