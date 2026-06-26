"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { AiSupportAvatar } from "./AiSupportAvatar"

interface Props {
  isOpen: boolean
  onClick: () => void
}

const BUTTON_SIZE = 90
const PEEK_VISIBLE = 26 // px visible when peeked at edge
const EDGE_SNAP_ZONE = 72 // px from edge that triggers snap-to-peek

export function AiSupportToggle({ isOpen, onClick }: Props) {
  const prompts = useMemo(
    () => [
      "How can I help you today?",
      "Need help? I'm here!",
      "Ask me anything!",
      "Hi! How can I assist you?",
      "What can I do for you?",
      "Need something? Just ask!",
    ],
    []
  )
  const [promptIndex, setPromptIndex] = useState(0)
  const [isPeeked, setIsPeeked] = useState(false)
  const [peekSide, setPeekSide] = useState<"left" | "right">("left")
  const [pos, setPos] = useState({ x: 20, y: 26 })

  // Keep latest pos in ref so pointer handlers don't go stale
  const posRef = useRef({ x: 20, y: 26 })
  const dragState = useRef({
    active: false,
    moved: false,
    cx: 0,
    cy: 0,
    px: 0,
    py: 0,
  })

  const updatePos = useCallback((next: { x: number; y: number }) => {
    posRef.current = next
    setPos(next)
  }, [])

  useEffect(() => {
    const id = setInterval(
      () => setPromptIndex((p) => (p + 1) % prompts.length),
      20000
    )
    return () => clearInterval(id)
  }, [prompts.length])

  // When chat opens, always un-peek
  useEffect(() => {
    if (isOpen && isPeeked) {
      const timeout = window.setTimeout(() => {
        setIsPeeked(false)
        const vw = window.innerWidth
        updatePos({
          x: peekSide === "left" ? 20 : vw - BUTTON_SIZE - 20,
          y: posRef.current.y,
        })
      }, 0)
      return () => window.clearTimeout(timeout)
    }
    return undefined
  }, [isOpen, isPeeked, peekSide, updatePos])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      const p = posRef.current
      dragState.current = {
        active: true,
        moved: false,
        cx: e.clientX,
        cy: e.clientY,
        px: p.x,
        py: p.y,
      }
    },
    []
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const ds = dragState.current
      if (!ds.active) return
      const dx = e.clientX - ds.cx
      const dy = e.clientY - ds.cy
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) ds.moved = true
      if (!ds.moved) return

      const vw = window.innerWidth
      const vh = window.innerHeight
      updatePos({
        x: Math.max(0, Math.min(vw - BUTTON_SIZE, ds.px + dx)),
        y: Math.max(0, Math.min(vh - BUTTON_SIZE, ds.py - dy)),
      })
    },
    [updatePos]
  )

  const handlePointerUp = useCallback(() => {
    const ds = dragState.current
    if (!ds.active) return
    ds.active = false

    if (!ds.moved) {
      // Pure tap → open chat
      onClick()
      return
    }

    // Snap to peek if dragged near left or right edge
    const vw = window.innerWidth
    const currentX = posRef.current.x

    if (currentX < EDGE_SNAP_ZONE) {
      setPeekSide("left")
      setIsPeeked(true)
      updatePos({ ...posRef.current, x: 0 })
    } else if (currentX > vw - BUTTON_SIZE - EDGE_SNAP_ZONE) {
      setPeekSide("right")
      setIsPeeked(true)
      updatePos({ ...posRef.current, x: vw - BUTTON_SIZE })
    }
  }, [onClick, updatePos])

  const handlePeekTabClick = useCallback(() => {
    const vw = window.innerWidth
    setIsPeeked(false)
    updatePos({
      x: peekSide === "left" ? 20 : vw - BUTTON_SIZE - 20,
      y: posRef.current.y,
    })
  }, [peekSide, updatePos])

  // Offset so widget slides off-screen when peeked, leaving only PEEK_VISIBLE px
  const peekOffset = isPeeked
    ? peekSide === "left"
      ? -(BUTTON_SIZE - PEEK_VISIBLE)
      : BUTTON_SIZE - PEEK_VISIBLE
    : 0

  // Flip prompt bubble to left when widget is on right half of screen
  const isOnRightHalf =
    pos.x + BUTTON_SIZE / 2 >
    (typeof window !== "undefined" ? window.innerWidth / 2 : 400)
  const bubbleStyle = isOnRightHalf ? "right-[86px] left-auto" : "left-[86px]"
  const bubbleTailStyle = isOnRightHalf
    ? "absolute -right-1.5 top-4 w-2.5 h-2.5 bg-white border-r border-t border-indigo-100 rotate-45"
    : "absolute -left-1.5 top-4 w-2.5 h-2.5 bg-white border-l border-b border-indigo-100 rotate-45"

  return (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        bottom: pos.y,
        zIndex: 9999,
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        transform: `translateX(${peekOffset}px)`,
        transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        touchAction: "none",
        userSelect: "none",
      }}
    >
      {isPeeked ? (
        /* ── Peeked state: show tab at screen edge ── */
        <button
          onClick={handlePeekTabClick}
          aria-label="Show AI Support"
          className="relative h-full w-full cursor-pointer border-0 bg-transparent p-0"
        >
          {/* Colored pull tab */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 ${
              peekSide === "left"
                ? "right-0 rounded-r-xl"
                : "left-0 rounded-l-xl"
            } flex h-14 w-6 items-center justify-center bg-gradient-to-b from-sky-500 to-indigo-500 shadow-lg`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
            >
              <polyline
                points={
                  peekSide === "left" ? "9 18 15 12 9 6" : "15 18 9 12 15 6"
                }
              />
            </svg>
          </div>
        </button>
      ) : (
        /* ── Normal / draggable state ── */
        <motion.div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: "100%",
            height: "100%",
            cursor: "grab",
            touchAction: "none",
          }}
          aria-label={isOpen ? "Close AI Support" : "Open AI Support"}
        >
          <div className="relative flex h-full w-full items-center justify-center">
            {/* Prompt bubble */}
            {!isOpen && (
              <div
                className={`absolute ${bubbleStyle} pointer-events-none bottom-7 max-w-[220px] min-w-[140px] rounded-2xl border border-indigo-100 bg-white px-3 py-2 text-[12.5px] text-slate-700 shadow-lg shadow-slate-200`}
              >
                <span className="block leading-snug break-words whitespace-normal">
                  {prompts[promptIndex]}
                </span>
                <span className={bubbleTailStyle} />
              </div>
            )}

            {/* AI avatar */}
            <motion.div
              className="relative z-10"
              animate={{ rotate: [0, -13, 12, -10, 8, 0, 0, 0] }}
              transition={{
                duration: 1.9,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.08, 0.16, 0.24, 0.32, 0.4, 0.7, 1],
              }}
              style={{ transformOrigin: "60% 78%", pointerEvents: "none" }}
            >
              <AiSupportAvatar size="lg" className="shadow-lg shadow-sky-100" />
            </motion.div>

            {/* Logo bubble */}
            <div className="pointer-events-none absolute -top-2.5 -right-1.5 z-20">
              <div className="relative flex items-center justify-center rounded-2xl border-2 border-indigo-200 bg-white px-1.5 py-1 shadow-lg shadow-indigo-100">
                <span className="text-[10px] font-bold tracking-tight text-sky-600">
                  AI
                </span>
                <div className="absolute -bottom-[7px] left-2.5 h-2.5 w-2.5 rotate-45 border-r-2 border-b-2 border-indigo-200 bg-white" />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
