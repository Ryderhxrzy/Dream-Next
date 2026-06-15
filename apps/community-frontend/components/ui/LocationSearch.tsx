"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, MapPin, X } from "lucide-react"

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
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function fetchSuggestions(q: string) {
    if (q.length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/location?q=${encodeURIComponent(q)}`)
      const data: Suggestion[] = await res.json()
      setSuggestions(data)
      setOpen(true)
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
        <MapPin className="text-muted-foreground pointer-events-none absolute left-3 h-3.5 w-3.5 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          required={required}
          className="bg-muted border-border focus:border-ring focus:ring-ring text-foreground placeholder:text-muted-foreground h-9 w-full rounded-md border pr-8 pl-8 text-sm ring-offset-0 transition-colors outline-none focus:ring-1"
        />
        <div className="absolute right-3">
          {loading ? (
            <Loader2 className="text-muted-foreground h-3.5 w-3.5 animate-spin" />
          ) : query ? (
            <button type="button" onClick={handleClear} tabIndex={-1}>
              <X className="text-muted-foreground hover:text-foreground h-3.5 w-3.5 transition-colors" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div className="bg-popover border-border absolute z-[9999] mt-1 w-full overflow-hidden rounded-lg border shadow-lg">
          {suggestions.map((s, i) => {
            const parts = s.display_name.split(", ")
            const main = parts[0]
            const sub = parts.slice(1, 4).join(", ")
            return (
              <button
                key={s.place_id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(s)}
                className={cn(
                  "hover:bg-accent flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors",
                  i !== 0 && "border-border border-t"
                )}
              >
                <MapPin className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-foreground truncate text-sm font-medium">
                    {main}
                  </p>
                  {sub && (
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                      {sub}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* No results */}
      {open && !loading && query.length >= 3 && suggestions.length === 0 && (
        <div className="bg-popover border-border absolute z-50 mt-1 w-full rounded-lg border px-3 py-3 text-center shadow-lg">
          <p className="text-muted-foreground text-sm">No locations found</p>
        </div>
      )}
    </div>
  )
}
