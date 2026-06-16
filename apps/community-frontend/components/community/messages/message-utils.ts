import { format, isToday, isYesterday } from "date-fns"

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

export function dateLabel(d: Date) {
  if (isToday(d)) return "Today"
  if (isYesterday(d)) return "Yesterday"
  return format(d, "MMMM d, yyyy")
}

export const EMOJIS = [
  "😀",
  "😂",
  "🥰",
  "😍",
  "😎",
  "🤩",
  "😭",
  "😅",
  "👍",
  "👏",
  "🙏",
  "🔥",
  "❤️",
  "💯",
  "🎉",
  "✨",
  "😴",
  "🤔",
  "😱",
  "😤",
  "🥳",
  "😇",
  "🤝",
  "👋",
  "🍕",
  "☕",
  "🏠",
  "🚗",
  "📦",
  "💬",
  "✅",
  "❓",
]
