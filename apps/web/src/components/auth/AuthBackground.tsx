'use client'

import { useState, useEffect } from 'react'

export function AuthBackground() {
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    // Delay opacity transition slightly for a smoother entry
    const timer = setTimeout(() => {
      setOpacity(0.45) // Keep opacity moderate so it blends beautifully with the gradient
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div 
      className="absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out pointer-events-none"
      style={{ 
        backgroundImage: `url('/auth-bg/Fondo3.webp')`,
        opacity: opacity,
      }}
    />
  )
}
