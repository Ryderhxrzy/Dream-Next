"use client"

import { useCallback, useRef, useState } from "react"

import type { ApiResponse, ChatMessage } from "../types"

const STORAGE_KEY = "af_ai_support_history_v1"

interface UiState {
  messages: ChatMessage[]
  quickReplies: string[]
}

function sanitizeMessages(messages: ChatMessage[]) {
  return messages.filter((message) =>
    ["text", "image", "product_cards", "step_images"].includes(message.kind)
  )
}

function persist(state: UiState) {
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        messages: sanitizeMessages(state.messages),
        quickReplies: [],
      })
    )
  } catch {}
}

function loadState(): UiState | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as UiState
    if (!parsed || !Array.isArray(parsed.messages)) return null
    return {
      messages: sanitizeMessages(parsed.messages),
      quickReplies: [],
    }
  } catch {
    return null
  }
}

export function useAiSupport() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [quickReplies, setQuickReplies] = useState<string[]>([])
  const [inputValue, setInputValue] = useState("")
  const [imageDataUrls, setImageDataUrls] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const initialized = useRef(false)

  const open = useCallback(() => {
    setIsOpen(true)
    if (initialized.current) return
    initialized.current = true

    const saved = loadState()
    if (saved && saved.messages.length > 0) {
      setMessages(saved.messages)
      setQuickReplies(saved.quickReplies)
    } else {
      const welcome: ChatMessage = {
        kind: "text",
        role: "bot",
        text: "Hi! How can we help?",
      }
      setMessages([welcome])
      setQuickReplies([])
      persist({ messages: [welcome], quickReplies: [] })
    }
  }, [])

  const close = useCallback(() => setIsOpen(false), [])

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) open()
      return !prev
    })
  }, [open])

  const send = useCallback(
    async (text: string) => {
      const msg = text.trim()
      if ((!msg && imageDataUrls.length === 0) || isLoading) return

      setInputValue("")

      setMessages((prev) => {
        const next: ChatMessage[] = [...prev]
        if (imageDataUrls.length > 0) {
          imageDataUrls.forEach((url) => {
            next.push({ kind: "image", role: "user", url })
          })
        }
        if (msg) {
          next.push({ kind: "text", role: "user", text: msg })
        }
        persist({ messages: next, quickReplies })
        return next
      })

      setIsLoading(true)

      try {
        const res = await fetch("/api/ai-support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: msg,
            images: imageDataUrls,
          }),
        })
        const data = (await res.json()) as ApiResponse
        const newQRs = Array.isArray(data.quick_replies)
          ? data.quick_replies
          : []

        setMessages((prev) => {
          const next: ChatMessage[] = sanitizeMessages(prev)
          if (data.status === "ok") {
            if (data.reply)
              next.push({ kind: "text", role: "bot", text: data.reply })
            if (data.product_cards?.length)
              next.push({
                kind: "product_cards",
                cards: data.product_cards.slice(0, 6),
              })
            if (data.step_images?.length)
              next.push({
                kind: "step_images",
                images: data.step_images.slice(0, 10),
              })
          } else {
            next.push({
              kind: "text",
              role: "bot",
              text: "I could not process your request right now.",
            })
          }
          persist({ messages: next, quickReplies: newQRs })
          return next
        })
        setQuickReplies(newQRs)
      } catch {
        setMessages((prev) => {
          const next: ChatMessage[] = [
            ...prev,
            {
              kind: "text",
              role: "bot",
              text: "Support is temporarily unavailable. Please try again.",
            },
          ]
          persist({ messages: next, quickReplies })
          return next
        })
      } finally {
        setIsLoading(false)
        if (imageDataUrls.length > 0) {
          setImageDataUrls([])
        }
      }
    },
    [imageDataUrls, isLoading, quickReplies]
  )

  return {
    isOpen,
    open,
    close,
    toggle,
    messages,
    quickReplies,
    inputValue,
    setInputValue,
    imageDataUrls,
    setImageDataUrls,
    send,
    isLoading,
  }
}
