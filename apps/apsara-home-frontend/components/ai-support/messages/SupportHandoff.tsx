import { Headphones } from "lucide-react"

import type { SupportHandoffMessage } from "../types"

interface Props {
  message: SupportHandoffMessage
  isLoading: boolean
  onContact: (message: SupportHandoffMessage) => void
}

export function SupportHandoff({ message, isLoading, onContact }: Props) {
  return (
    <div className="ml-12 max-w-[80%] rounded-2xl border border-indigo-100 bg-white p-3 shadow-sm">
      <button
        type="button"
        onClick={() => onContact(message)}
        disabled={isLoading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-[13px] font-bold text-white shadow-sm shadow-indigo-100 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Headphones className="h-4 w-4" />
        {isLoading ? "Creating request..." : message.handoff.button_text}
      </button>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        A support agent can review account, order, payment, affiliate, or
        encashment records when verification is needed.
      </p>
    </div>
  )
}
