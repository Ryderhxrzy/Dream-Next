"use client"

import { useEffect, useRef } from "react"

import { BrandCards } from "./messages/BrandCards"
import { CategoryCards } from "./messages/CategoryCards"
import { ImageMessage } from "./messages/ImageMessage"
import { ProductCards } from "./messages/ProductCards"
import { StepImages } from "./messages/StepImages"
import { TextMessage } from "./messages/TextMessage"
import type { ChatMessage } from "./types"

const API_BASE = (process.env.NEXT_PUBLIC_LARAVEL_API_URL ?? "").replace(
  /\/+$/,
  ""
)
const ROBOT_SRC = `${API_BASE}/Image/sir.png`

interface Props {
  messages: ChatMessage[]
  isLoading: boolean
}

export function AiSupportBody({ messages, isLoading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-slate-50 px-4 py-3">
      {messages.map((msg, i) => {
        if (msg.kind === "text") return <TextMessage key={i} message={msg} />
        if (msg.kind === "image") return <ImageMessage key={i} message={msg} />
        if (msg.kind === "cards") return <ProductCards key={i} message={msg} />
        if (msg.kind === "brand_cards")
          return <BrandCards key={i} message={msg} />
        if (msg.kind === "category_cards")
          return <CategoryCards key={i} message={msg} />
        if (msg.kind === "step_images")
          return <StepImages key={i} message={msg} />
        return null
      })}

      {isLoading && (
        <div className="flex items-end gap-2">
          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-none">
            <img
              src={ROBOT_SRC}
              alt="AI"
              className="h-full w-full object-contain"
            />
          </div>
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
