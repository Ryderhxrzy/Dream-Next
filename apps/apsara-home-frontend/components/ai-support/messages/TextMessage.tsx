import type { TextMessage as TextMessageType } from "../types"
import { AiSupportAvatar } from "../AiSupportAvatar"

function Linkify({ text }: { text: string }) {
  const lines = text.split(/\r?\n/)
  return (
    <>
      {lines.map((line, lineIdx) => {
        const parts = line.split(/(https?:\/\/[^\s]+)/g)
        return (
          <span key={`line-${lineIdx}`}>
            {parts.map((part, i) =>
              /^https?:\/\//.test(part) ? (
                <a
                  key={`link-${lineIdx}-${i}`}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-cyan-300 underline"
                >
                  {part}
                </a>
              ) : (
                part
              )
            )}
            {lineIdx < lines.length - 1 && <br />}
          </span>
        )
      })}
    </>
  )
}

export function TextMessage({ message }: { message: TextMessageType }) {
  const isBot = message.role === "bot"
  return (
    <div
      className={`flex items-end gap-2 ${isBot ? "justify-start" : "justify-end"}`}
    >
      {isBot && (
        <AiSupportAvatar />
      )}
      <div
        className={`max-w-[80%] rounded-[18px] px-3.5 py-2.5 text-[13.5px] leading-relaxed break-words ${
          isBot
            ? "rounded-bl-[5px] bg-gradient-to-br from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-100"
            : "rounded-br-[5px] border border-slate-200 bg-white text-slate-800 shadow-sm"
        }`}
      >
        <Linkify text={message.text} />
      </div>
    </div>
  )
}
