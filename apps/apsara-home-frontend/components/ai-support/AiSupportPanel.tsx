"use client"

import { AnimatePresence, motion } from "framer-motion"

import { AiSupportBody } from "./AiSupportBody"
import { AiSupportFooter } from "./AiSupportFooter"
import { AiSupportHeader } from "./AiSupportHeader"
import { AiSupportQuickReplies } from "./AiSupportQuickReplies"
import type { ChatMessage } from "./types"

interface Props {
  isOpen: boolean
  messages: ChatMessage[]
  quickReplies: string[]
  inputValue: string
  isLoading: boolean
  onClose: () => void
  onInputChange: (v: string) => void
  onSend: (text: string) => void
  images: string[]
  onImageChange: (dataUrls: string[]) => void
  hasImage: boolean
}

export function AiSupportPanel({
  isOpen,
  messages,
  quickReplies,
  inputValue,
  isLoading,
  onClose,
  onInputChange,
  onSend,
  images,
  onImageChange,
  hasImage,
}: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className={[
            "fixed z-[9999] flex flex-col overflow-hidden",
            "rounded-3xl border border-indigo-100/60 bg-white",
            "shadow-2xl shadow-slate-200/60",
            /* desktop */
            "bottom-[120px] left-[18px] h-[580px] max-h-[74vh] w-[370px]",
            /* mobile */
            "max-[576px]:right-2.5 max-[576px]:bottom-[106px] max-[576px]:left-2.5 max-[576px]:h-[70vh] max-[576px]:w-auto",
            "max-w-[calc(100vw-20px)]",
          ].join(" ")}
          style={{
            fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
          }}
        >
          <AiSupportHeader onClose={onClose} />
          <AiSupportBody messages={messages} isLoading={isLoading} />
          <AiSupportQuickReplies items={quickReplies} onSelect={onSend} />
          <AiSupportFooter
            value={inputValue}
            onChange={onInputChange}
            onSend={() => onSend(inputValue)}
            images={images}
            onImageChange={onImageChange}
            hasImage={hasImage}
            disabled={isLoading}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
