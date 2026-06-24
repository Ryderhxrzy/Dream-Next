"use client"

import { useEffect, useState } from "react"
import {
  useCreateConversationWithCustomerMutation,
  useGetAdminConversationQuery,
} from "@/store/api/adminConversationsApi"
import { AnimatePresence, motion } from "framer-motion"

import CloseConversationButton from "./CloseConversationButton"
import ConversationThread from "./ConversationThread"

interface Props {
  open: boolean
  onClose: () => void
  customerId: number | null | undefined
  customerName?: string | null
  /** Subject used only when a brand-new conversation is created. */
  subject?: string
}

const getInitials = (name?: string | null) => {
  if (!name) return "C"
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "C"
  )
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export default function AdminCustomerChatDrawer({
  open,
  onClose,
  customerId,
  customerName,
  subject,
}: Props) {
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [createConv, { isError: createError }] =
    useCreateConversationWithCustomerMutation()
  const { data: convData } = useGetAdminConversationQuery(conversationId ?? 0, {
    skip: !conversationId,
  })

  // Open → find-or-create the conversation for this customer.
  useEffect(() => {
    if (!open || !customerId || customerId <= 0) return
    let active = true
    createConv({ customer_id: customerId, subject })
      .unwrap()
      .then((res) => {
        if (active && res?.data?.id) setConversationId(res.data.id)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [open, customerId, subject, createConv])

  // Reset when the drawer closes (during render — avoids a cascading effect).
  const [prevOpen, setPrevOpen] = useState(open)
  if (prevOpen !== open) {
    setPrevOpen(open)
    if (!open) setConversationId(null)
  }

  const headerName = convData?.data?.customer?.name || customerName || "Customer"
  const headerEmail = convData?.data?.customer?.email || "Support conversation"

  return (
    <AnimatePresence>
      {open && customerId && customerId > 0 ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-[1px]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
            className="fixed top-0 right-0 z-[121] flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-teal-400 to-teal-600 text-sm font-bold text-white">
                {getInitials(headerName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                  {headerName}
                </p>
                <p className="truncate text-[11px] text-slate-400">{headerEmail}</p>
              </div>
              {conversationId ? (
                <CloseConversationButton
                  conversationId={conversationId}
                  status={convData?.data?.status}
                />
              ) : null}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Live
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close chat"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Thread */}
            <div className="flex min-h-0 flex-1 flex-col">
              {conversationId ? (
                <ConversationThread conversationId={conversationId} />
              ) : (
                <div className="flex flex-1 items-center justify-center gap-2 text-slate-400">
                  {createError ? (
                    <span className="text-sm text-rose-500">
                      Couldn&apos;t start the conversation. Please try again.
                    </span>
                  ) : (
                    <>
                      <Spinner />
                      <span className="text-sm">Opening conversation…</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
