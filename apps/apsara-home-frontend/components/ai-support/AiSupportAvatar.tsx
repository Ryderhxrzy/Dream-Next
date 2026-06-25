"use client"

import Image from "next/image"

type Props = {
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeClass = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-16 w-16",
}

export function AiSupportAvatar({ size = "md", className = "" }: Props) {
  return (
    <div
      className={`${sizeClass[size]} flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm ${className}`}
    >
      <Image
        src="/sir.png"
        alt="AF Home AI"
        width={size === "lg" ? 64 : size === "md" ? 40 : 32}
        height={size === "lg" ? 64 : size === "md" ? 40 : 32}
        className="h-full w-full object-contain"
        priority={size === "lg"}
      />
    </div>
  )
}
