"use client"

import { useState } from "react"
import Image from "next/image"

interface Conversation {
  id: string
  name: string
  avatar?: string | undefined
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  online: boolean
}

interface ConversationListProps {
  isOpen: boolean
  onClose: () => void
  onSelectConversation: (conversation: Conversation) => void
}

export default function ConversationList({
  isOpen,
  onClose,
  onSelectConversation,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // Mock conversations data - this would come from an API in production
  const conversations: Conversation[] = [
    {
      id: "1",
      name: "Customer Support",
      avatar: undefined,
      lastMessage: "Hello! How can I help you today?",
      lastMessageTime: "2m ago",
      unreadCount: 0,
      online: true,
    },
    {
      id: "2",
      name: "IKEA Philippines",
      avatar: undefined,
      lastMessage: "Your order has been shipped",
      lastMessageTime: "1h ago",
      unreadCount: 2,
      online: true,
    },
    {
      id: "3",
      name: "Mandaue Foam",
      avatar: undefined,
      lastMessage: "Thank you for your purchase!",
      lastMessageTime: "3h ago",
      unreadCount: 0,
      online: false,
    },
    {
      id: "4",
      name: "Uratex Philippines",
      avatar: undefined,
      lastMessage: "New arrivals are now available",
      lastMessageTime: "1d ago",
      unreadCount: 1,
      online: true,
    },
  ]

  const filteredConversations = conversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="absolute top-full right-0 z-50 mt-2">
      <div className="relative">
        {/* Arrow pointing to icon */}
        <div className="absolute -top-2 right-3 h-4 w-4 rotate-45 transform bg-orange-500" />
        <div className="flex h-[500px] w-[380px] flex-col rounded-lg border border-gray-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-orange-500 px-4 py-3">
            <h3 className="text-base font-bold text-white">Messages</h3>
            <button
              onClick={onClose}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-white transition hover:bg-orange-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="border-b border-gray-200 p-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
            />
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#d1d5db"
                    strokeWidth="1.5"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-medium text-gray-500">
                  No messages found
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => onSelectConversation(conv)}
                    className="flex w-full cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-gray-50"
                  >
                    <div className="relative">
                      {conv.avatar ? (
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-100">
                          <Image
                            src={conv.avatar}
                            alt={conv.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
                          {conv.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {conv.online && (
                        <div className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="truncate text-sm font-semibold text-gray-900">
                          {conv.name}
                        </h4>
                        <span className="shrink-0 text-xs text-gray-400">
                          {conv.lastMessageTime}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <p className="truncate text-sm text-gray-500">
                          {conv.lastMessage}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-orange-500 px-1 text-xs leading-none text-white">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
