"use client"

import { format, isSameDay } from "date-fns"
import { motion } from "framer-motion"
import { Send, Loader2, MessageCircle, ArrowLeft, Smile, ImagePlus, X, MoreHorizontal } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { initials, dateLabel, EMOJIS } from "./message-utils"
import type { ChatMessage, Conversation } from "@/lib/hooks/use-messages"

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
  activeConvo, messages, currentUserId, otherTyping, otherOnline, otherReadAt,
  draft, imagePreview, sending, bottomRef, fileInputRef,
  onBack, onDraftChange, onSend, onImagePick, onClearImage, onInsertEmoji, onImageLoad,
}: ChatThreadProps) {
  if (!activeConvo) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mb-3">
          <MessageCircle className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">Your messages</p>
        <p className="text-xs text-muted-foreground mt-0.5">Select a conversation to start chatting</p>
      </div>
    )
  }

  const other = activeConvo.otherUser

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <button onClick={onBack} className="md:hidden text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="relative shrink-0">
          <Avatar className="w-9 h-9">
            <AvatarImage src={other?.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {initials(other?.name ?? "?")}
            </AvatarFallback>
          </Avatar>
          {otherOnline && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{other?.name}</p>
          <p className={cn("text-[11px] flex items-center gap-1", otherOnline ? "text-emerald-600" : "text-muted-foreground")}>
            {otherTyping ? "typing…" : otherOnline ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active now
              </>
            ) : "Offline"}
          </p>
        </div>
        <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground"><MoreHorizontal className="w-4 h-4" /></Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-3 flex flex-col">
        <div className="space-y-1 mt-auto">
          {messages?.map((m, i) => {
            const mine = m.senderId === currentUserId
            const created = new Date(m.createdAt)
            const prev = i > 0 ? messages[i - 1] : null
            const next = i < messages.length - 1 ? messages[i + 1] : null
            const showDateSep = !prev || !isSameDay(created, new Date(prev.createdAt))
            const showAvatar = !mine && (!next || next.senderId !== m.senderId)

            const lastMineIndex = messages.reduce((acc, mm, idx) => (mm.senderId === currentUserId ? idx : acc), -1)
            const isLastMine = mine && i === lastMineIndex
            const isLast = i === messages.length - 1
            const seen = otherReadAt && new Date(otherReadAt) >= created

            return (
              <div key={m.id}>
                {showDateSep && (
                  <div className="flex justify-center my-3">
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                      {dateLabel(created)}
                    </span>
                  </div>
                )}
                <div className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
                  {!mine && (
                    <div className="w-7 shrink-0">
                      {showAvatar && (
                        <Avatar className="w-7 h-7">
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
                    className={cn("flex flex-col max-w-[70%]", mine ? "items-end" : "items-start")}
                  >
                    <div
                      className={cn(
                        "overflow-hidden",
                        m.imageUrl ? "rounded-2xl" : cn(
                          "rounded-2xl px-3.5 py-2 text-sm",
                          mine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"
                        )
                      )}
                    >
                      {m.imageUrl ? (
                        <div className="space-y-1">
                          <img src={m.imageUrl} alt="" onLoad={onImageLoad} className="rounded-2xl max-w-full max-h-64 object-cover" />
                          {m.content && <p className="text-sm px-1 text-foreground">{m.content}</p>}
                        </div>
                      ) : (
                        m.content
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 px-1">
                      <span className="text-[10px] text-muted-foreground">{format(created, "h:mm a")}</span>
                      {isLastMine && (
                        <span className="text-[10px] text-muted-foreground font-medium">· {seen ? "Read" : "Sent"}</span>
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>
            )
          })}

          {/* Typing indicator */}
          {otherTyping && (
            <div className="flex items-end gap-2 justify-start">
              <Avatar className="w-7 h-7">
                <AvatarImage src={other?.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-muted text-foreground text-[10px] font-semibold">
                  {initials(other?.name ?? "?")}
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="px-4 pt-3 bg-card">
          <div className="relative inline-block">
            <img src={imagePreview} alt="" className="h-20 rounded-lg border border-border object-cover" />
            <button
              type="button"
              onClick={onClearImage}
              className="absolute -top-2 -right-2 w-5 h-5 bg-zinc-900 text-white rounded-full flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={onSend} className="border-t border-border bg-card">
        <div className="flex items-center gap-1.5 px-6 py-3 w-full">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onImagePick} aria-hidden />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 rounded-full text-muted-foreground hover:text-foreground shrink-0"
          >
            <ImagePlus className="w-5 h-5" />
          </Button>

          <div className="flex-1 relative">
            <Input
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              placeholder={`Message ${other?.name?.split(" ")[0] ?? ""}…`}
              className="h-10 bg-muted border-transparent rounded-full pr-10"
            />
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <Smile className="w-5 h-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-2">
                <div className="grid grid-cols-8 gap-1">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => onInsertEmoji(emoji)}
                      className="text-lg hover:bg-accent rounded p-1 transition-colors"
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
            className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </form>
    </>
  )
}
