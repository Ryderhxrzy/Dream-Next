"use client"

import { useState, useEffect, useRef } from "react"
import { MapPin, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Suggestion {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

interface LocationSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}

export function LocationSearch({
  value,
  onChange,
  placeholder = "Search location...",
  required,
}: LocationSearchProps) {
  const [query, setQuery]             = useState(value)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading]         = useState(false)
  const [open, setOpen]               = useState(false)
  const debounceRef                   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef                  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function fetchSuggestions(q: string) {
    if (q.length < 3) { setSuggestions([]); setOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/location?q=${encodeURIComponent(q)}`)
      const data: Suggestion[] = await res.json()
      setSuggestions(data)
      setOpen(data.length > 0)
    } catch {
      setSuggestions([])
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    onChange(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 600)
  }

  function handleSelect(s: Suggestion) {
    const parts = s.display_name.split(", ")
    const short = parts.slice(0, 3).join(", ")
    setQuery(short)
    onChange(short)
    setOpen(false)
    setSuggestions([])
  }

  function handleClear() {
    setQuery("")
    onChange("")
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="relative flex items-center">
        <MapPin className="absolute left-3 w-3.5 h-3.5 text-zinc-400 pointer-events-none shrink-0" />
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          required={required}
          className="w-full h-9 pl-8 pr-8 text-sm bg-zinc-50 border border-zinc-200 rounded-md outline-none ring-offset-0 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 text-zinc-900 placeholder:text-zinc-400 transition-colors"
        />
        <div className="absolute right-3">
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin" />
          ) : query ? (
            <button type="button" onClick={handleClear} tabIndex={-1}>
              <X className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-700 transition-colors" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div className="absolute z-9999 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((s, i) => {
            const parts = s.display_name.split(", ")
            const main  = parts[0]
            const sub   = parts.slice(1, 4).join(", ")
            return (
              <button
                key={s.place_id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(s)}
                className={cn(
                  "w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-zinc-50 transition-colors",
                  i !== 0 && "border-t border-zinc-100"
                )}
              >
                <MapPin className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{main}</p>
                  {sub && <p className="text-xs text-zinc-400 truncate mt-0.5">{sub}</p>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* No results */}
      {open && !loading && query.length >= 3 && suggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg px-3 py-3 text-center">
          <p className="text-sm text-zinc-400">No locations found</p>
        </div>
      )}
    </div>
  )
}
