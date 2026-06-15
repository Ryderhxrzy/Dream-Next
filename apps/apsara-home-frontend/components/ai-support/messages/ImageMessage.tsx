import type { ImageMessage as ImageMessageType } from "../types"

const API_BASE = (process.env.NEXT_PUBLIC_LARAVEL_API_URL ?? "").replace(
  /\/+$/,
  ""
)
const ROBOT_SRC = `${API_BASE}/Image/sir.png`

export function ImageMessage({ message }: { message: ImageMessageType }) {
  const isBot = message.role === "bot"
  return (
    <div
      className={`flex items-end gap-2 ${isBot ? "justify-start" : "justify-end"}`}
    >
      {isBot && (
        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-none">
          <img
            src={ROBOT_SRC}
            alt="AI"
            className="h-full w-full object-contain"
          />
        </div>
      )}
      <a
        href={message.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`block max-w-[80%] overflow-hidden rounded-[18px] border ${
          isBot
            ? "rounded-bl-[5px] border-indigo-100 bg-white shadow-md shadow-indigo-100"
            : "rounded-br-[5px] border-slate-200 bg-white shadow-sm"
        }`}
      >
        <div className="h-28 w-28 sm:h-32 sm:w-32 md:h-36 md:w-36">
          <img
            src={message.url}
            alt="Uploaded"
            className="block h-full w-full object-cover"
          />
        </div>
      </a>
    </div>
  )
}
