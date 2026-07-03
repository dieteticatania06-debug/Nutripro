'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { authApi, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Loader } from '@/components/ui/loader'
import { CheckCircle2, XCircle } from 'lucide-react'

function VerificarEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Token no proporcionado')
      return
    }

    authApi.verifyEmail(token)
      .then(() => {
        setStatus('success')
        setMessage('Tu email ha sido verificado. Ya puedes iniciar sesión.')
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err instanceof ApiError ? err.message : 'Error al verificar el email')
      })
  }, [token])

  return (
    <div className="w-full max-w-md bg-white/25 backdrop-blur-xl border border-white/50 shadow-2xl shadow-orange-950/5 rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between text-center animate-in fade-in duration-300">
      <div className="mt-8 mb-6 flex flex-col items-center">
        {status === 'loading' && (
          <Loader label="Verificando..." />
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-[#2C5E43] mb-4" />
            <h2 className="text-3xl font-serif font-black text-[#2D1E1B]">Email Verificado</h2>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-destructive mb-4" />
            <h2 className="text-3xl font-serif font-black text-destructive">Error de Verificación</h2>
          </>
        )}
        <p className="text-sm text-[#2D1E1B]/75 mt-4 leading-relaxed font-semibold">{message}</p>
      </div>

      <div className="pt-6 border-t border-orange-100/10">
        {status === 'success' && (
          <Button asChild className="w-full rounded-full font-bold shadow-sm">
            <Link href="/auth/login">Iniciar Sesión</Link>
          </Button>
        )}
        {status === 'error' && (
          <Button asChild variant="outline" className="w-full rounded-full font-bold shadow-sm">
            <Link href="/">Volver al inicio</Link>
          </Button>
        )}
      </div>
    </div>
  )
}

export default function VerificarEmailPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md bg-white/25 backdrop-blur-xl border border-white/50 shadow-2xl shadow-orange-950/5 rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between text-center">
        <Loader label="Cargando..." />
      </div>
    }>
      <VerificarEmailContent />
    </Suspense>
  )
}
