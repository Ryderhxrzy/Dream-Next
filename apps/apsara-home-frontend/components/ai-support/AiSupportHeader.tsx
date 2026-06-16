import { X } from "lucide-react"

interface Props {
  onClose: () => void
  logoSrc: string
}

export function AiSupportHeader({ onClose, logoSrc }: Props) {
  return (
    <div className="relative flex flex-shrink-0 items-center justify-between overflow-hidden bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-500 px-4 py-3.5">
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/[.07]" />
      <div className="pointer-events-none absolute -bottom-6 left-10 h-16 w-16 rounded-full bg-white/[.05]" />

      <div className="relative z-10 flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/15 shadow-lg backdrop-blur-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt="AF"
            className="h-6 w-6 rounded-md object-contain"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm leading-tight font-bold tracking-tight text-white">
            <span className="text-amber-300">A</span>
            <span className="text-cyan-300">F</span>
            Shop AI
          </span>
          <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-white/75">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Online now
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close chat"
        className="relative z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/20 bg-white/15 text-white transition-colors duration-150 hover:bg-white/25"
      >
        <X size={15} strokeWidth={2.5} />
      </button>
    </div>
  )
}
