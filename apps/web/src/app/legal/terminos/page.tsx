import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/layout/Logo'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Términos de Servicio | NutriPro' }

export default function TerminosPage() {
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
          <h1 className="text-4xl font-extrabold tracking-tight text-[#2D1E1B] font-serif">Términos de Servicio</h1>
          <p className="text-muted-foreground text-xs font-semibold">Última actualización: 22 de junio de 2026</p>
        </div>

        <div className="bg-white/45 backdrop-blur-xl border border-white/40 rounded-[2rem] p-8 shadow-xl space-y-6 text-sm text-foreground/80 leading-relaxed font-medium">
          <section className="space-y-2.5">
            <h2 className="text-lg font-bold text-[#2D1E1B]">1. Aceptación de los términos</h2>
            <p>
              Al registrarte y hacer uso de los servicios de NutriPro, aceptas de forma expresa y sin reservas los presentes Términos de Servicio. Si no estás de acuerdo con alguna de las pautas descritas, no debes hacer uso de la plataforma.
            </p>
          </section>

          <section className="space-y-2.5">
            <h2 className="text-lg font-bold text-[#2D1E1B]">2. Descripción del servicio</h2>
            <p>
              NutriPro es una plataforma online que conecta a los usuarios con una dietista autorizada para recibir planes personalizados de nutrición, pautas de ejercicio físico complementario y seguimiento continuo de peso y progreso corporal.
            </p>
            <p className="font-bold text-primary">
              Aviso Importante: La información y planes proporcionados son asesoramiento nutricional y deportivo. En ningún caso sustituyen un diagnóstico o tratamiento médico especializado. Si padeces alguna patología grave o trastorno de salud severo, debes consultar con tu médico especialista.
            </p>
          </section>

          <section className="space-y-2.5">
            <h2 className="text-lg font-bold text-[#2D1E1B]">3. Citas y cancelaciones</h2>
            <p>
              Los usuarios con planes contratados tienen acceso a la reserva de citas de asesoramiento. Para garantizar un correcto funcionamiento del servicio y respeto al profesional, la solicitud de citas o sus cancelaciones/modificaciones deberán realizarse con al menos 24 horas de antelación.
            </p>
          </section>

          <section className="space-y-2.5">
            <h2 className="text-lg font-bold text-[#2D1E1B]">4. Modificaciones y terminación del servicio</h2>
            <p>
              NutriPro no tiene cláusulas de permanencia. Los usuarios pueden cancelar su suscripción en cualquier momento. Nos reservamos el derecho a modificar, suspender o interrumpir el acceso a la plataforma de forma parcial o total en caso de uso indebido de los chats, faltas de respeto al profesional o impago del plan contratado.
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
            <Link href="/legal/cookies" className="hover:text-primary transition-colors">Cookies</Link>
            <Link href="/legal/terminos" className="hover:text-primary transition-colors text-primary">Términos</Link>
            <a href="mailto:dieteticatania06@gmail.com" className="hover:text-primary transition-colors">Contacto</a>
          </div>
          <span>© {new Date().getFullYear()} NutriPro. Todos los derechos reservados.</span>
        </div>
      </footer>
    </div>
  )
}
