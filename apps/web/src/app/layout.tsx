import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
})

export const metadata: Metadata = {
  title: {
    default: 'NutriPro — Asesoría Nutricional Profesional',
    template: '%s | NutriPro',
  },
  description:
    'Transforma tu salud con un plan nutricional personalizado. Asesoría nutricional online profesional, dietas personalizadas y seguimiento continuo.',
  keywords: ['nutrición', 'dietista', 'dieta personalizada', 'pérdida de peso', 'asesoría nutricional'],
  authors: [{ name: 'NutriPro' }],
  creator: 'NutriPro',
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://nutripro.es',
    title: 'NutriPro — Asesoría Nutricional Profesional',
    description: 'Transforma tu salud con un plan nutricional personalizado.',
    siteName: 'NutriPro',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NutriPro — Asesoría Nutricional Profesional',
    description: 'Transforma tu salud con un plan nutricional personalizado.',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/Logo/logo.svg',
    shortcut: '/Logo/logo.svg',
    apple: '/Logo/logo.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (window.location.hostname === 'localhost') {
                window.location.hostname = '127.0.0.1';
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.className} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
