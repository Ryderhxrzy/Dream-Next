"use client"

import { format, isSameDay } from "date-fns"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  ImagePlus,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Send,
  Smile,
  X,
} from "lucide-react"

import type { ChatMessage, Conversation } from "@/lib/hooks/use-messages"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { dateLabel, EMOJIS, initials } from "./message-utils"

interface ChatThreadProps {
  activeConvo: Conversation | undefined
  messages: ChatMessage[] | undefined
  currentUserId: string | undefined
  otherTyping: boolean
  otherOnline: boolean
  otherReadAt: string | null
  draft: string
  imagePreview: string | null
  sending: boolean
  bottomRef: React.RefObject<HTMLDivElement | null>
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onBack: () => void
  onDraftChange: (v: string) => void
  onSend: (e: React.FormEvent) => void
  onImagePick: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClearImage: () => void
  onInsertEmoji: (emoji: string) => void
  onImageLoad: () => void
}

export function ChatThread({
  activeConvo,
  messages,
  currentUserId,
  otherTyping,
  otherOnline,
  otherReadAt,
  draft,
  imagePreview,
  sending,
  bottomRef,
  fileInputRef,
  onBack,
  onDraftChange,
  onSend,
  onImagePick,
  onClearImage,
  onInsertEmoji,
  onImageLoad,
}: ChatThreadProps) {
  if (!activeConvo) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="bg-accent mb-3 flex h-14 w-14 items-center justify-center rounded-full">
          <MessageCircle className="text-muted-foreground h-6 w-6" />
        </div>
        <p className="text-foreground text-sm font-medium">Your messages</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Select a conversation to start chatting
        </p>
      </div>
    )
  }

  const other = activeConvo.otherUser

  return (
    <>
      {/* Header */}
      <div className="border-border bg-card flex items-center gap-3 border-b px-4 py-3">
        <button onClick={onBack} className="text-muted-foreground md:hidden">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="relative shrink-0">
          <Avatar className="h-9 w-9">
            <AvatarImage src={other?.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {initials(other?.name ?? "?")}
            </AvatarFallback>
          </Avatar>
          {otherOnline && (
            <span className="ring-card absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-semibold">
            {other?.name}
          </p>
          <p
            className={cn(
              "flex items-center gap-1 text-[11px]",
              otherOnline ? "text-emerald-600" : "text-muted-foreground"
            )}
          >
            {otherTyping ? (
              "typing…"
            ) : otherOnline ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active now
              </>
            ) : (
              "Offline"
            )}
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground h-8 w-8 rounded-full"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col overflow-y-auto px-6 py-3">
        <div className="mt-auto space-y-1">
          {messages?.map((m, i) => {
            const mine = m.senderId === currentUserId
            const created = new Date(m.createdAt)
            const prev = i > 0 ? messages[i - 1] : null
            const next = i < messages.length - 1 ? messages[i + 1] : null
            const showDateSep =
              !prev || !isSameDay(created, new Date(prev.createdAt))
            const showAvatar = !mine && (!next || next.senderId !== m.senderId)

            const lastMineIndex = messages.reduce(
              (acc, mm, idx) => (mm.senderId === currentUserId ? idx : acc),
              -1
            )
            const isLastMine = mine && i === lastMineIndex
            const isLast = i === messages.length - 1
            const seen = otherReadAt && new Date(otherReadAt) >= created

            return (
              <div key={m.id}>
                {showDateSep && (
                  <div className="my-3 flex justify-center">
                    <span className="text-muted-foreground bg-muted rounded-full px-2.5 py-1 text-[10px] font-medium">
                      {dateLabel(created)}
                    </span>
                  </div>
                )}
                <div
                  className={cn(
                    "flex items-end gap-2",
                    mine ? "justify-end" : "justify-start"
                  )}
                >
                  {!mine && (
                    <div className="w-7 shrink-0">
                      {showAvatar && (
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={m.sender.avatarUrl ?? undefined} />
                          <AvatarFallback className="bg-muted text-foreground text-[10px] font-semibold">
                            {initials(m.sender.name)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )}

                  <motion.div
                    initial={isLast ? { opacity: 0, y: 8, scale: 0.96 } : false}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      "flex max-w-[70%] flex-col",
                      mine ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "overflow-hidden",
                        m.imageUrl
                          ? "rounded-2xl"
                          : cn(
                              "rounded-2xl px-3.5 py-2 text-sm",
                              mine
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted text-foreground rounded-bl-md"
                            )
                      )}
                    >
                      {m.imageUrl ? (
                        <div className="space-y-1">
                          <img
                            src={m.imageUrl}
                            alt=""
                            onLoad={onImageLoad}
                            className="max-h-64 max-w-full rounded-2xl object-cover"
                          />
                          {m.content && (
                            <p className="text-foreground px-1 text-sm">
                              {m.content}
                            </p>
                          )}
                        </div>
                      ) : (
                        m.content
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 px-1">
                      <span className="text-muted-foreground text-[10px]">
                        {format(created, "h:mm a")}
                      </span>
                      {isLastMine && (
                        <span className="text-muted-foreground text-[10px] font-medium">
                          · {seen ? "Read" : "Sent"}
                        </span>
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>
            )
          })}

          {/* Typing indicator */}
          {otherTyping && (
            <div className="flex items-end justify-start gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={other?.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-muted text-foreground text-[10px] font-semibold">
                  {initials(other?.name ?? "?")}
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted flex items-center gap-1 rounded-2xl rounded-bl-md px-4 py-3">
                <span className="bg-muted-foreground/60 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
                <span className="bg-muted-foreground/60 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
                <span className="bg-muted-foreground/60 h-1.5 w-1.5 animate-bounce rounded-full" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="bg-card px-4 pt-3">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt=""
              className="border-border h-20 rounded-lg border object-cover"
            />
            <button
              type="button"
              onClick={onClearImage}
              className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={onSend} className="border-border bg-card border-t">
        <div className="flex w-full items-center gap-1.5 px-6 py-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onImagePick}
            aria-hidden
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            className="text-muted-foreground hover:text-foreground h-9 w-9 shrink-0 rounded-full"
          >
            <ImagePlus className="h-5 w-5" />
          </Button>

          <div className="relative flex-1">
            <Input
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              placeholder={`Message ${other?.name?.split(" ")[0] ?? ""}…`}
              className="bg-muted h-10 rounded-full border-transparent pr-10"
            />
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                >
                  <Smile className="h-5 w-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-2">
                <div className="grid grid-cols-8 gap-1">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => onInsertEmoji(emoji)}
                      className="hover:bg-accent rounded p-1 text-lg transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <Button
            type="submit"
            size="icon"
            disabled={(!draft.trim() && !imagePreview) || sending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 w-10 shrink-0 rounded-full"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </>
  )
}
