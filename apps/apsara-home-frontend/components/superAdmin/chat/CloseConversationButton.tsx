"use client"

import { useUpdateConversationStatusMutation } from "@/store/api/adminConversationsApi"

export default function CloseConversationButton({
  conversationId,
  status,
}: {
  conversationId: number
  status?: string | null
}) {
  const [updateStatus, { isLoading }] = useUpdateConversationStatusMutation()
  const isResolved = status === "resolved"

  return (
    <button
      type="button"
      onClick={() =>
        updateStatus({
          conversationId,
          status: isResolved ? "open" : "resolved",
        })
      }
      disabled={isLoading}
      title={isResolved ? "Reopen conversation" : "Close conversation"}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
        isResolved
          ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300"
          : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
      }`}
    >
      {isResolved ? (
        <>
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reopen
        </>
      ) : (
        <>
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Close
        </>
      )}
    </button>
  )
}
