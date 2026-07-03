import type { Metadata } from 'next'
import { AjustesView } from '@/components/layout/AjustesView'

export const metadata: Metadata = {
  title: 'Ajustes de Administrador',
}

export default function AjustesAdminPage() {
  return <AjustesView backUrl="/admin" roleTitle="Administrador" />
}
