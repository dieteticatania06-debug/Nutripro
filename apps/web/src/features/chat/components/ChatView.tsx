'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { chatApi, ApiError } from '@/lib/api'
import type { Chat, Message } from '@nutripro/shared'
import { useAuthStore } from '@/features/auth/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatRelativeTime } from '@/lib/utils'
import { Send, MessageSquare } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

import { Loader } from '@/components/ui/loader'

import { useClientDashboardStore } from '@/features/dashboard/store/dashboardStore'

const POLL_INTERVAL = 3000

export function ChatView() {
  const { user } = useAuthStore()
  const { chat: storeChat, messages: storeMessages, isLoaded, setMessages: setStoreMessages } = useClientDashboardStore()
  const [chat, setChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(!isLoaded)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { register, handleSubmit, reset, watch, setValue } = useForm<{ content: string }>()
  const content = watch('content')

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const loadChat = useCallback(async () => {
    try {
      const c = await chatApi.getChat()
      setChat(c as Chat)
      return c as Chat
    } catch {
      return null
    }
  }, [])

  const loadMessages = useCallback(async (chatId: string) => {
    try {
      const msgs = await chatApi.getMessages(chatId)
      setMessages(msgs as Message[])
      setStoreMessages(msgs as Message[])
      scrollToBottom()
    } catch {
      // Fail silently during polling
    }
  }, [scrollToBottom, setStoreMessages])

  // Initial load
  useEffect(() => {
    if (isLoaded) {
      setChat(storeChat)
      setMessages(storeMessages)
      setIsLoading(false)
    }
  }, [isLoaded, storeChat, storeMessages])

  // Polling — pause when tab is hidden
  useEffect(() => {
    if (!chat) return
    let interval: ReturnType<typeof setInterval>

    const startPolling = () => {
      interval = setInterval(() => loadMessages(chat.id), POLL_INTERVAL)
    }

    const stopPolling = () => clearInterval(interval)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadMessages(chat.id)
        startPolling()
      } else {
        stopPolling()
      }
    }

    startPolling()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [chat, loadMessages])

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const onSubmit = async (data: { content: string }) => {
    if (!chat || !data.content.trim()) return
    setIsSending(true)

    // Optimistic update
    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      chatId: chat.id,
      senderId: user?.id ?? '',
      senderRole: 'client',
      content: data.content.trim(),
      readAt: null,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    setStoreMessages((prev) => [...prev, optimistic])
    reset()

    try {
      const sent = await chatApi.sendMessage(chat.id, data.content.trim())
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? sent as Message : m))
      setStoreMessages((prev) => prev.map((m) => m.id === optimistic.id ? sent as Message : m))
    } catch (err) {
      // Remove optimistic and show error
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setStoreMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      toast({ title: 'Error al enviar', description: 'Inténtalo de nuevo', variant: 'destructive' })
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="h-[70vh] flex items-center justify-center">
        <Loader label="Cargando chat..." />
      </Card>
    )
  }

  return (
    <Card className="h-[70vh] flex flex-col shadow-md border-muted/70 bg-card/60 backdrop-blur-sm overflow-hidden animate-in fade-in duration-300">
      <CardHeader className="border-b py-3.5 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-sm font-bold flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-foreground/90">Tu Dietista</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className={cn("flex-1 overflow-y-auto p-4 bg-muted/5", messages.length === 0 ? "flex flex-col items-center justify-center" : "space-y-4")}>
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground space-y-2.5">
            <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <MessageSquare className="h-5 w-5 opacity-65" />
            </div>
            <div>
              <p className="font-semibold text-sm">No hay mensajes todavía</p>
              <p className="text-xs">Escribe tu primera consulta a tu nutricionista.</p>
            </div>
          </div>
        )}
        
        {messages.map((msg) => {
          const isOwn = msg.senderRole === 'client'
          return (
            <div key={msg.id} className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm leading-relaxed border',
                  isOwn
                    ? 'bg-primary border-primary/20 text-primary-foreground rounded-br-none'
                    : 'bg-card border-muted/80 text-foreground rounded-bl-none'
                )}
              >
                <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                <p className={cn('text-[10px] mt-1.5 font-medium select-none', isOwn ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground/75')}>
                  {formatRelativeTime(msg.createdAt)}
                  {isOwn && msg.readAt && ' · Leído'}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </CardContent>
      
      <div className="border-t p-3 bg-muted/10 space-y-3">
        {/* Quick templates */}
        <div className="flex flex-wrap gap-1.5 pb-1">
          {[
            "Tengo una duda sobre mi menú de hoy",
            "¿Puedo cambiar un ejercicio de mi rutina?",
            "Solicito reprogramación de cita"
          ].map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => setValue('content', text, { shouldValidate: true })}
              className="text-[10px] sm:text-xs font-bold text-muted-foreground/90 border border-muted hover:border-primary/50 bg-card hover:bg-primary/[0.01] hover:text-primary transition-all px-3 py-1.5 rounded-full shadow-sm text-left flex items-center gap-1.5"
            >
              <MessageSquare className="w-3 h-3 shrink-0 opacity-60 text-primary" />
              <span>{text}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2">
          <Input
            placeholder="Escribe un mensaje..."
            autoComplete="off"
            {...register('content', { required: true })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(onSubmit)()
              }
            }}
            className="text-xs bg-background rounded-xl"
          />
          <Button type="submit" size="icon" disabled={isSending || !content?.trim()} className="rounded-xl shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  )
}
