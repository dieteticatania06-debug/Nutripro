import React from 'react'

interface LoaderProps {
  label?: string
  className?: string
  fullScreen?: boolean
}

export function Loader({ label, className = '', fullScreen = false }: LoaderProps) {
  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm'
    : `flex flex-col items-center justify-center py-12 w-full gap-3 ${className}`

  return (
    <div className={containerClasses}>
      <div className="loading-heartbeat">
        <svg width="64px" height="48px" viewBox="0 0 64 48">
          <polyline
            points="0.157 23.954, 14 23.954, 21.843 48, 43 0, 50 24, 64 24"
            id="back"
          />
          <polyline
            points="0.157 23.954, 14 23.954, 21.843 48, 43 0, 50 24, 64 24"
            id="front"
          />
        </svg>
      </div>
      {label && (
        <p className="text-sm font-semibold text-muted-foreground animate-pulse tracking-wide select-none">
          {label}
        </p>
      )}
    </div>
  )
}
