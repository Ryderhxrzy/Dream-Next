"use client"

import { useState } from "react"

interface AvatarImgProps {
  src?: string | null
  name: string
  size?: string
  bg?: string
  textSize?: string
  className?: string
}

export default function AvatarImg({
  src,
  name,
  size = "h-9 w-9",
  bg = "bg-gradient-to-br from-slate-500 to-slate-600",
  textSize = "text-xs",
  className = "",
}: AvatarImgProps) {
  const [err, setErr] = useState(false)
  const initials =
    (name ?? "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?"

  if (src && !err) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setErr(true)}
        className={`shrink-0 rounded-full object-cover ${size} ${className}`}
      />
    )
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${size} ${bg} ${className}`}
    >
      <span className={textSize}>{initials}</span>
    </div>
  )
}
