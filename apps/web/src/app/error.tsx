'use client'

import { useEffect } from 'react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Captured error in root boundary:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center p-6 bg-muted/20">
      <h2 className="text-xl font-bold tracking-tight text-destructive">Ha ocurrido un error inesperado</h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">
        {error.message || 'La aplicación ha detectado un problema al cargar esta sección.'}
      </p>
      <div className="flex gap-4 mt-6">
        <button
          onClick={() => reset()}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/95"
        >
          Reintentar
        </button>
        <a
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-semibold shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Ir al Inicio
        </a>
      </div>
    </div>
  )
}
