import type { Metadata } from 'next'
import { AjustesView } from '@/components/layout/AjustesView'

export const metadata: Metadata = {
  title: 'Ajustes',
}

export default function AjustesClientPage() {
  return <AjustesView backUrl="/dashboard" roleTitle="Usuario" />
}
