"use client"

import { useEffect, useRef } from "react"
import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"

const hours   = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"))
const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"))
const periods = ["AM", "PM"]

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function TimePicker({ value, onChange, placeholder = "Pick a time" }: TimePickerProps) {
  const [open, setOpen]     = useState(false)
  const [hour, setHour]     = useState("12")
  const [minute, setMinute] = useState("00")
  const [period, setPeriod] = useState("AM")

  const hourRef   = useRef<HTMLDivElement>(null)
  const minuteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(":")
      const hNum = parseInt(h)
      setPeriod(hNum >= 12 ? "PM" : "AM")
      setHour(String(hNum > 12 ? hNum - 12 : hNum === 0 ? 12 : hNum).padStart(2, "0"))
      setMinute(m ?? "00")
    }
  }, [])

  // Scroll selected item into view when popover opens
  useEffect(() => {
    if (!open) return
    setTimeout(() => {
      const activeHour = hourRef.current?.querySelector("[data-active='true']")
      const activeMin  = minuteRef.current?.querySelector("[data-active='true']")
      activeHour?.scrollIntoView({ block: "center" })
      activeMin?.scrollIntoView({ block: "center" })
    }, 50)
  }, [open])

  function apply(h: string, m: string, p: string) {
    let h24 = parseInt(h)
    if (p === "AM" && h24 === 12) h24 = 0
    if (p === "PM" && h24 !== 12) h24 += 12
    onChange(`${String(h24).padStart(2, "0")}:${m}`)
  }

  function selectHour(h: string)   { setHour(h);   apply(h, minute, period) }
  function selectMinute(m: string) { setMinute(m); apply(hour, m, period) }
  function selectPeriod(p: string) { setPeriod(p); apply(hour, minute, p) }

  const displayTime = value
    ? (() => {
        const [h, m] = value.split(":")
        const hNum = parseInt(h)
        const p    = hNum >= 12 ? "PM" : "AM"
        const h12  = hNum > 12 ? hNum - 12 : hNum === 0 ? 12 : hNum
        return `${String(h12).padStart(2, "0")}:${m} ${p}`
      })()
    : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full h-9 justify-start text-sm font-normal bg-muted border-border",
            !displayTime && "text-muted-foreground"
          )}
        >
          <Clock className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
          {displayTime ?? placeholder}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0 overflow-hidden" align="start">
        <div className="flex divide-x divide-border">

          {/* Hours */}
          <div
            ref={hourRef}
            className="h-52 w-16 overflow-y-scroll scroll-smooth"
            style={{ scrollbarWidth: "none" }}
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="py-1">
              {hours.map((h) => (
                <button
                  key={h}
                  type="button"
                  data-active={hour === h}
                  onClick={() => selectHour(h)}
                  className={cn(
                    "w-full px-3 py-2 text-sm text-center transition-colors hover:bg-accent",
                    hour === h
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-foreground"
                  )}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* Minutes */}
          <div
            ref={minuteRef}
            className="h-52 w-16 overflow-y-scroll scroll-smooth"
            style={{ scrollbarWidth: "none" }}
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="py-1">
              {minutes.map((m) => (
                <button
                  key={m}
                  type="button"
                  data-active={minute === m}
                  onClick={() => selectMinute(m)}
                  className={cn(
                    "w-full px-3 py-2 text-sm text-center transition-colors hover:bg-accent",
                    minute === m
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-foreground"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* AM/PM */}
          <div className="flex flex-col py-1 w-16">
            {periods.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => selectPeriod(p)}
                className={cn(
                  "w-full px-3 py-2 text-sm text-center transition-colors hover:bg-accent",
                  period === p
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-foreground"
                )}
              >
                {p}
              </button>
            ))}
          </div>

        </div>
      </PopoverContent>
    </Popover>
  )
}
