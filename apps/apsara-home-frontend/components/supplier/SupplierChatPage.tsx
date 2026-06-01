'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  CheckCheck,
  Image as ImageIcon,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Search,
  Send,
  Smile,
  X,
} from 'lucide-react'

interface Conversation {
  id: string
  name: string
  initials: string
  color: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  online: boolean
  messages: Message[]
}

interface Message {
  id: string
  text: string
  isMine: boolean
  timestamp: string
  status: 'sent' | 'delivered' | 'read'
}

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: '1',
    name: 'Maria Santos',
    initials: 'MS',
    color: 'bg-rose-500',
    lastMessage: 'Is the sofa set still available?',
    lastMessageTime: '2m ago',
    unreadCount: 3,
    online: true,
    messages: [
      { id: 'm1', text: 'Hi! I saw your listing for the L-shaped sofa.', isMine: false, timestamp: '10:01 AM', status: 'read' },
      { id: 'm2', text: "Yes, it's still available! Which color are you interested in?", isMine: true, timestamp: '10:03 AM', status: 'read' },
      { id: 'm3', text: 'The gray one. Can I see more photos?', isMine: false, timestamp: '10:05 AM', status: 'read' },
      { id: 'm4', text: 'Sure, let me send them over.', isMine: true, timestamp: '10:06 AM', status: 'read' },
      { id: 'm5', text: 'Is the sofa set still available?', isMine: false, timestamp: '10:09 AM', status: 'read' },
    ],
  },
  {
    id: '2',
    name: 'Juan dela Cruz',
    initials: 'JC',
    color: 'bg-blue-500',
    lastMessage: 'When can I pick it up?',
    lastMessageTime: '1h ago',
    unreadCount: 1,
    online: true,
    messages: [
      { id: 'm1', text: 'Good afternoon! I placed order #ORD-4821.', isMine: false, timestamp: '9:00 AM', status: 'read' },
      { id: 'm2', text: 'Hello Juan! Your order is ready for pickup.', isMine: true, timestamp: '9:15 AM', status: 'read' },
      { id: 'm3', text: 'When can I pick it up?', isMine: false, timestamp: '9:30 AM', status: 'delivered' },
    ],
  },
  {
    id: '3',
    name: 'Ana Reyes',
    initials: 'AR',
    color: 'bg-emerald-500',
    lastMessage: 'Thank you so much!',
    lastMessageTime: '3h ago',
    unreadCount: 0,
    online: false,
    messages: [
      { id: 'm1', text: 'I just received my order. Everything looks great!', isMine: false, timestamp: '7:00 AM', status: 'read' },
      { id: 'm2', text: 'So glad to hear that! Enjoy your new furniture 😊', isMine: true, timestamp: '7:05 AM', status: 'read' },
      { id: 'm3', text: 'Thank you so much!', isMine: false, timestamp: '7:06 AM', status: 'read' },
    ],
  },
  {
    id: '4',
    name: 'Carlo Mendoza',
    initials: 'CM',
    color: 'bg-violet-500',
    lastMessage: 'Do you offer installment?',
    lastMessageTime: '1d ago',
    unreadCount: 0,
    online: false,
    messages: [
      { id: 'm1', text: 'Hello, do you offer installment plans?', isMine: false, timestamp: 'Yesterday', status: 'read' },
      { id: 'm2', text: 'Hi Carlo! Yes, we partner with BDO and BPI for 0% installment.', isMine: true, timestamp: 'Yesterday', status: 'read' },
      { id: 'm3', text: 'Do you offer installment?', isMine: false, timestamp: 'Yesterday', status: 'read' },
    ],
  },
  {
    id: '5',
    name: 'Liza Fernandez',
    initials: 'LF',
    color: 'bg-amber-500',
    lastMessage: 'Please send me the price list.',
    lastMessageTime: '2d ago',
    unreadCount: 0,
    online: true,
    messages: [
      { id: 'm1', text: "Hi! I'm redecorating my living room.", isMine: false, timestamp: 'Mon', status: 'read' },
      { id: 'm2', text: "We'd love to help! What's your budget range?", isMine: true, timestamp: 'Mon', status: 'read' },
      { id: 'm3', text: 'Please send me the price list.', isMine: false, timestamp: 'Mon', status: 'read' },
    ],
  },
]

function Avatar({ initials, color, online, size = 'md' }: { initials: string; color: string; online?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-11 w-11 text-sm' : size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'
  const dotClass = size === 'lg' ? 'h-3 w-3' : 'h-2.5 w-2.5'

  return (
    <div className="relative shrink-0">
      <div className={`${sizeClass} ${color} flex items-center justify-center rounded-full font-bold text-white`}>
        {initials}
      </div>
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 ${dotClass} rounded-full border-2 border-white dark:border-slate-900 ${online ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
      )}
    </div>
  )
}

export default function SupplierChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const active = conversations.find((c) => c.id === activeId) ?? null
  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )
  const totalUnread = conversations.reduce((n, c) => n + c.unreadCount, 0)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active?.messages])

  const selectConversation = (conv: Conversation) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
    )
    setActiveId(conv.id)
    setIsMobileOpen(true)
  }

  const sendMessage = () => {
    if (!input.trim() || !activeId) return
    const msg: Message = {
      id: `m${Date.now()}`,
      text: input.trim(),
      isMine: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    }
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, messages: [...c.messages, msg], lastMessage: msg.text, lastMessageTime: 'now' }
          : c
      )
    )
    setInput('')
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    // Outer container fills the main scroll area exactly — no overflow, no scrollbar
    <div className="flex h-[calc(100vh-104px)] flex-col gap-3 lg:h-[calc(100vh-120px)]">
      {/* Page header — fixed height, shrinks to content */}
      <div className="shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-400">
          Supplier
        </p>
        <div className="mt-0.5 flex items-center gap-3">
          <h1 className="text-[26px] font-black tracking-tight text-slate-900 dark:text-white">Chats</h1>
          {totalUnread > 0 && (
            <span className="inline-flex items-center rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-bold text-white">
              {totalUnread} new
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Manage customer conversations and inquiries.
        </p>
      </div>

      {/* Chat layout — flex-1 fills all remaining height */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

        {/* Left: conversation list */}
        <div className={`flex w-full flex-col border-r border-slate-100 dark:border-slate-800 md:w-80 md:flex-shrink-0 ${isMobileOpen ? 'hidden md:flex' : 'flex'}`}>
          {/* List header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Messages</span>
              {totalUnread > 0 && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                  {totalUnread}
                </span>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="border-b border-slate-100 px-3 py-3 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-indigo-500"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                  <MessageSquare className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-sm text-slate-400">No conversations found</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {filtered.map((conv) => {
                  const isActive = conv.id === activeId
                  return (
                    <button
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition ${
                        isActive
                          ? 'bg-indigo-50 dark:bg-indigo-500/10'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <Avatar initials={conv.initials} color={conv.color} online={conv.online} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`truncate text-[13px] font-semibold ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-100'}`}>
                            {conv.name}
                          </span>
                          <span className="ml-2 shrink-0 text-[10px] text-slate-400">{conv.lastMessageTime}</span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <p className="truncate text-[12px] text-slate-500 dark:text-slate-400">{conv.lastMessage}</p>
                          {conv.unreadCount > 0 && (
                            <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: chat window */}
        <div className={`flex flex-1 flex-col ${!isMobileOpen && !active ? 'hidden md:flex' : 'flex'}`}>
          {active ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <Avatar initials={active.initials} color={active.color} online={active.online} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[14px] font-bold text-slate-900 dark:text-white">{active.name}</p>
                  <p className={`text-[11px] font-medium ${active.online ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {active.online ? 'Online' : 'Offline'}
                  </p>
                </div>
                <button className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 px-5 py-5">
                {active.messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}>
                    {!msg.isMine && (
                      <Avatar initials={active.initials} color={active.color} size="sm" />
                    )}
                    <div className={`ml-2 max-w-[72%] ${msg.isMine ? 'ml-0 mr-0' : ''}`}>
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          msg.isMine
                            ? 'rounded-br-md bg-indigo-600 text-white'
                            : 'rounded-bl-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <div className={`mt-1 flex items-center gap-1 ${msg.isMine ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                        {msg.isMine && (
                          <CheckCheck className={`h-3 w-3 ${msg.status === 'read' ? 'text-indigo-500' : 'text-slate-400'}`} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
                  <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700">
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700">
                    <ImageIcon className="h-4 w-4" />
                  </button>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Type a message…"
                    className="flex-1 bg-transparent py-1.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
                  />
                  <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700">
                    <Smile className="h-4 w-4" />
                  </button>
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim()}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center p-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 dark:bg-indigo-500/10">
                <MessageSquare className="h-9 w-9 text-indigo-400" />
              </div>
              <div>
                <p className="text-[17px] font-bold text-slate-800 dark:text-slate-100">No conversation selected</p>
                <p className="mt-1.5 max-w-xs text-sm text-slate-400 dark:text-slate-500">
                  Pick a conversation from the list to start chatting with your customers.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
