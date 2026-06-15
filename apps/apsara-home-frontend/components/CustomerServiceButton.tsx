"use client"

import { useState } from "react"
import { extractPartnerSlugFromPath } from "@/libs/storefrontRouting"
import { AnimatePresence, motion } from "framer-motion"
import { usePathname } from "next/navigation"

import ChatModal from "./ChatModal"

export default function CustomerServiceButton() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const partnerSlug = extractPartnerSlugFromPath(pathname)

  if (pathname.startsWith("/ranking") || Boolean(partnerSlug)) return null

  return (
    <>
      {/* Main Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(true)}
            className="fixed right-6 bottom-6 z-[100] flex h-12 w-12 items-center justify-center rounded-full border border-orange-600 bg-orange-500 text-white transition-all duration-200 dark:border-orange-700 dark:bg-orange-600"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Customer Service"
          >
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Modal Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[99] bg-black/30 dark:bg-black/50"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Chat Modal */}
      <AnimatePresence>
        {isOpen && <ChatModal onClose={() => setIsOpen(false)} />}
      </AnimatePresence>
    </>
  )
}
