'use client'

import { useEffect, useRef, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { chatApi } from '@/lib/api'
import type { Chat, Message } from '@nutripro/shared'
import { useAuthStore } from '@/features/auth/store/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn, formatRelativeTime, getInitials, getAvatarUrl } from '@/lib/utils'
import Image from 'next/image'
import { Send, MessageSquare } from 'lucide-react'

const POLL_INTERVAL = 3000

interface ChatListItem extends Chat {
  firstName: string | null
  lastName: string | null
  email: string | null
  avatarUrl?: string | null
}

import { useAdminDashboardStore } from '@/features/dashboard/store/dashboardStore'

function AdminChatContent() {
  const searchParams = useSearchParams()
  const preselectedUserId = searchParams.get('userId')
  const { user } = useAuthStore()
  const { chats: storeChats, isLoaded, chatsLoaded, reloadChats } = useAdminDashboardStore()
  const [chats, setChats] = useState<ChatListItem[]>([])
  const [selectedChat, setSelectedChat] = useState<ChatListItem | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isSending, setIsSending] = useState(false)
  const [content, setContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const loadChats = useCallback(async () => {
    await reloadChats()
  }, [reloadChats])

  const loadMessages = useCallback(async (chatId: string) => {
    const msgs = await chatApi.getMessages(chatId)
    setMessages(msgs as Message[])
    scrollToBottom()
  }, [scrollToBottom])

  useEffect(() => {
    if (isLoaded) {
      if (!chatsLoaded) {
        reloadChats()
      } else {
        setChats(storeChats)
        // Autoselect if userId param
        if (preselectedUserId && storeChats.length > 0) {
          const found = storeChats.find((c) => c.userId === preselectedUserId)
          if (found) setSelectedChat(found)
        }
      }
    }
  }, [isLoaded, chatsLoaded, storeChats, preselectedUserId, reloadChats])

  useEffect(() => {
    if (!selectedChat) return
    loadMessages(selectedChat.id)
    const interval = setInterval(() => loadMessages(selectedChat.id), POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [selectedChat, loadMessages])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  const handleSelectChat = async (chat: ChatListItem) => {
    setSelectedChat(chat)
    setMessages([])
  }

  const handleSend = async () => {
    if (!selectedChat || !content.trim()) return
    setIsSending(true)
    try {
      const optimistic: Message = {
        id: `opt-${Date.now()}`,
        chatId: selectedChat.id,
        senderId: user?.id ?? '',
        senderRole: 'admin',
        content: content.trim(),
        readAt: null,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, optimistic])
      const txt = content.trim()
      setContent('')
      const sent = await chatApi.sendMessage(selectedChat.id, txt)
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? sent as Message : m))
      await loadChats()
    } finally {
      setIsSending(false)
    }
  }

  const clientName = (chat: ChatListItem) =>
    [chat.firstName, chat.lastName].filter(Boolean).join(' ') || chat.email || 'Cliente'

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chat con Clientes</h1>
        <p className="text-muted-foreground">Gestiona las conversaciones</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[70vh]">
        {/* Chat list */}
        <Card className="overflow-y-auto border border-white/40 bg-white/45 backdrop-blur-xl">
          <CardHeader className="pb-3"><CardTitle className="text-base">Conversaciones</CardTitle></CardHeader>
          <CardContent className="p-2 space-y-1">
            {!chatsLoaded ? (
              <Loader label="Cargando chats..." />
            ) : chats.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Sin conversaciones</p>
              </div>
            ) : (
              chats.map((chat) => (
                <button key={chat.id}
                  onClick={() => handleSelectChat(chat)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-3',
                    selectedChat?.id === chat.id ? 'bg-primary text-primary-foreground' : 'hover:bg-white/20'
                  )}
                >
                  <div className="relative w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20 shrink-0">
                    <Image
                      src={getAvatarUrl(chat.avatarUrl, chat.email ?? 'default')}
                      alt="Avatar"
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{clientName(chat)}</p>
                    {chat.lastMessageAt && (
                      <p className="text-xs opacity-70">{formatRelativeTime(chat.lastMessageAt)}</p>
                    )}
                  </div>
                  {(chat.unreadByAdmin ?? 0) > 0 && (
                    <Badge className="shrink-0 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {chat.unreadByAdmin}
                    </Badge>
                  )}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="lg:col-span-2 flex flex-col border border-white/40 bg-white/45 backdrop-blur-xl">
          {!selectedChat ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-10 w-10 mx-auto mb-3" />
                <p>Selecciona una conversación</p>
              </div>
            </div>
          ) : (
            <>
              <CardHeader className="border-b py-3">
                <CardTitle className="text-base">{clientName(selectedChat)}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => {
                  const isOwn = msg.senderRole === 'admin'
                  return (
                    <div key={msg.id} className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                        'max-w-[75%] rounded-lg px-4 py-2 text-sm',
                        isOwn ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'
                      )}>
                        <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                        <p className={cn('text-xs mt-1', isOwn ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground')}>
                          {formatRelativeTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </CardContent>
              <div className="border-t p-3">
                <div className="flex gap-2">
                  <Input
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  />
                  <Button size="icon" onClick={handleSend} disabled={isSending || !content.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

import { Loader } from '@/components/ui/loader'

export default function AdminChatPage() {
  return (
    <Suspense fallback={<Loader label="Cargando..." />}>
      <AdminChatContent />
    </Suspense>
  )
}
