"use client"

import { useEffect, useRef } from "react"

import { ImageMessage } from "./messages/ImageMessage"
import { ProductCards } from "./messages/ProductCards"
import { StepImages } from "./messages/StepImages"
import { SupportHandoff } from "./messages/SupportHandoff"
import { TextMessage } from "./messages/TextMessage"
import { AiSupportAvatar } from "./AiSupportAvatar"
import type { ChatMessage } from "./types"

interface Props {
  messages: ChatMessage[]
  isLoading: boolean
  isCreatingSupportRequest: boolean
  onSupportHandoff: (message: Extract<ChatMessage, { kind: "support_handoff" }>) => void
}

export function AiSupportBody({
  messages,
  isLoading,
  isCreatingSupportRequest,
  onSupportHandoff,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-slate-50 px-4 py-3">
      {messages.map((msg, i) => {
        if (msg.kind === "text") return <TextMessage key={i} message={msg} />
        if (msg.kind === "image") return <ImageMessage key={i} message={msg} />
        if (msg.kind === "product_cards")
          return <ProductCards key={i} message={msg} />
        if (msg.kind === "step_images")
          return <StepImages key={i} message={msg} />
        if (msg.kind === "support_handoff")
          return (
            <SupportHandoff
              key={i}
              message={msg}
              isLoading={isCreatingSupportRequest}
              onContact={onSupportHandoff}
            />
          )
        return null
      })}

      {isLoading && (
        <div className="flex items-end gap-2">
          <AiSupportAvatar />
          <div className="rounded-[18px] rounded-bl-[5px] bg-gradient-to-br from-indigo-600 to-indigo-500 px-4 py-3 shadow-md shadow-indigo-100">
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70 [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70 [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}