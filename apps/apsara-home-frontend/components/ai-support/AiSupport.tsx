"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

import { AiSupportPanel } from "./AiSupportPanel"
import { AiSupportToggle } from "./AiSupportToggle"
import { useAiSupport } from "./hooks/useAiSupport"

const DISABLED_PREFIXES = [
  "/admin",
  "/supplier",
  "/loading",
  "/interior-services",
  "/login",
  "/checkout",
  "/orders",
  "/track-order",
  "/verification",
]

function useIsAllowed() {
  const pathname = usePathname()
  if (pathname === "/") return false
  return !DISABLED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  )
}

function useIsLoadingScreenVisible() {
  const [isLoadingScreenVisible, setIsLoadingScreenVisible] = useState(false)

  useEffect(() => {
    const check = () => {
      setIsLoadingScreenVisible(
        Boolean(document.getElementById("af-loading-screen"))
      )
    }

    check()
    const observer = new MutationObserver(check)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])

  return isLoadingScreenVisible
}

export function AiSupport() {
  const allowed = useIsAllowed()
  const isLoadingScreenVisible = useIsLoadingScreenVisible()
  const {
    isOpen,
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
  } = useAiSupport()

  if (!allowed || isLoadingScreenVisible) return null

  return (
    <>
      <AiSupportToggle
        onClick={toggle}
        isOpen={isOpen}
      />
      <AiSupportPanel
        isOpen={isOpen}
        messages={messages}
        quickReplies={quickReplies}
        inputValue={inputValue}
        isLoading={isLoading}
        onClose={close}
        onInputChange={setInputValue}
        onSend={send}
        images={imageDataUrls}
        onImageChange={setImageDataUrls}
        hasImage={imageDataUrls.length > 0}
      />
    </>
  )
}
