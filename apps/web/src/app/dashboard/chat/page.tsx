import type { Metadata } from 'next'
import { ChatView } from '@/features/chat/components/ChatView'

export const metadata: Metadata = { title: 'Chat con Dietista' }

export default function ChatPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Chat con tu Dietista</h1>
        <p className="text-muted-foreground">Consulta tus dudas directamente</p>
      </div>
      <ChatView />
    </div>
  )
}
