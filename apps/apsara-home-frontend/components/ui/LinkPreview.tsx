"use client"

import { useEffect, useState } from "react"

interface OGData {
  title: string
  description: string
  image: string
  siteName: string
  favicon: string
  url: string
}

export default function LinkPreview({
  url,
  mine,
}: {
  url: string
  mine: boolean
}) {
  const [data, setData] = useState<OGData | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setData(null)
    setFailed(false)

    fetch(`/api/og-preview?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        if (json.error || !json.title) {
          setFailed(true)
          return
        }
        setData(json as OGData)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [url])

  if (failed) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`block break-all text-xs underline underline-offset-2 ${mine ? "text-indigo-200" : "text-indigo-500 dark:text-indigo-300"}`}
      >
        {url}
      </a>
    )
  }

  if (!data) {
    return (
      <div
        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${mine ? "bg-indigo-700/50" : "bg-slate-100 dark:bg-slate-800"}`}
      >
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent opacity-50" />
        <span
          className={`truncate opacity-60 ${mine ? "text-white" : "text-slate-500"}`}
        >
          {url}
        </span>
      </div>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block overflow-hidden rounded-2xl border transition hover:opacity-90 ${
        mine
          ? "border-indigo-400/30 bg-indigo-700/60"
          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
      }`}
    >
      {data.image ? (
        <img
          src={data.image}
          alt={data.title}
          className="h-36 w-full object-cover"
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.display = "none"
          }}
        />
      ) : null}
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <img
            src={data.favicon}
            alt=""
            className="h-3.5 w-3.5 shrink-0 rounded-sm"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = "none"
            }}
          />
          <span
            className={`truncate text-[10px] font-semibold uppercase tracking-wide ${mine ? "text-indigo-200" : "text-slate-400 dark:text-slate-500"}`}
          >
            {data.siteName}
          </span>
        </div>
        {data.title ? (
          <p
            className={`line-clamp-2 text-xs font-semibold leading-snug ${mine ? "text-white" : "text-slate-800 dark:text-slate-100"}`}
          >
            {data.title}
          </p>
        ) : null}
        {data.description ? (
          <p
            className={`mt-0.5 line-clamp-2 text-[11px] leading-relaxed ${mine ? "text-indigo-200" : "text-slate-500 dark:text-slate-400"}`}
          >
            {data.description}
          </p>
        ) : null}
      </div>
    </a>
  )
}
