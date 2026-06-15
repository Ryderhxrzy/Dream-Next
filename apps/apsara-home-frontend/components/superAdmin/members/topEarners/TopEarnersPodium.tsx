"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShoppingBag, Users } from "lucide-react"
import TierBadge from "@/components/ui/TierBadge"
import { TopEarner, STATUS_CONFIG, MEDALS, php } from "./types"

/* ─── Count-up hook ──────────────────────────────────────────────────────── */
function useCountUp(target: number, duration = 1400, delay = 0) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    setValue(0)
    let rafId: number
    const timer = setTimeout(() => {
      let start: number | null = null
      const step = (ts: number) => {
        if (start === null) start = ts
        const p = Math.min((ts - start) / duration, 1)
        const eased = 1 - Math.pow(1 - p, 3)
        setValue(Math.round(target * eased))
        if (p < 1) rafId = requestAnimationFrame(step)
      }
      rafId = requestAnimationFrame(step)
    }, delay)
    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(rafId)
    }
  }, [target, duration, delay])
  return value
}

/* ─── Avatar ─────────────────────────────────────────────────────────────── */
function MemberAvatar({
  src,
  name,
  size,
  ringCls,
  bgCls,
}: {
  src?: string
  name: string
  size: string
  ringCls: string
  bgCls: string
}) {
  const [err, setErr] = useState(false)
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
  if (src && !err) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setErr(true)}
        className={`rounded-full object-cover ${size} ${ringCls}`}
      />
    )
  }
  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold text-white ${size} ${ringCls} ${bgCls}`}
    >
      {initials}
    </div>
  )
}

/* ─── Award laurel SVG ───────────────────────────────────────────────────── */
function AwardLaurel({ color, size = 170 }: { color: string; size?: number }) {
  const c = size / 2
  const orbitR = 65
  const lx = 11
  const ly = 3.8
  const leftDeg = [215, 200, 185, 170, 155, 140, 125, 110, 95]
  const rightDeg = [325, 340, 355, 10, 25, 40, 55, 70, 85]
  const toRad = (d: number) => (d * Math.PI) / 180
  const Leaf = ({ deg, i }: { deg: number; i: number }) => {
    const rad = toRad(deg)
    const x = c + orbitR * Math.cos(rad)
    const y = c + orbitR * Math.sin(rad)
    const scale = i % 2 === 0 ? 1 : 0.88
    return (
      <ellipse
        cx={x}
        cy={y}
        rx={lx * scale}
        ry={ly * scale}
        transform={`rotate(${deg} ${x} ${y})`}
        fill={color}
        opacity={0.82}
      />
    )
  }
  const leftStart = {
    x: c + orbitR * Math.cos(toRad(215)),
    y: c + orbitR * Math.sin(toRad(215)),
  }
  const leftEnd = {
    x: c + orbitR * Math.cos(toRad(95)),
    y: c + orbitR * Math.sin(toRad(95)),
  }
  const rightStart = {
    x: c + orbitR * Math.cos(toRad(325)),
    y: c + orbitR * Math.sin(toRad(325)),
  }
  const rightEnd = {
    x: c + orbitR * Math.cos(toRad(85)),
    y: c + orbitR * Math.sin(toRad(85)),
  }
  const leftCtrl = {
    x: c + orbitR * Math.cos(toRad(155)),
    y: c + orbitR * Math.sin(toRad(155)),
  }
  const rightCtrl = {
    x: c + orbitR * Math.cos(toRad(25)),
    y: c + orbitR * Math.sin(toRad(25)),
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <path
        d={`M ${leftStart.x} ${leftStart.y} Q ${leftCtrl.x} ${leftCtrl.y} ${leftEnd.x} ${leftEnd.y}`}
        stroke={color}
        strokeWidth="1.5"
        strokeOpacity="0.45"
        fill="none"
      />
      <path
        d={`M ${rightStart.x} ${rightStart.y} Q ${rightCtrl.x} ${rightCtrl.y} ${rightEnd.x} ${rightEnd.y}`}
        stroke={color}
        strokeWidth="1.5"
        strokeOpacity="0.45"
        fill="none"
      />
      <circle cx={c} cy={c + orbitR + 6} r="3.5" fill={color} opacity="0.55" />
      {leftDeg.map((deg, i) => (
        <Leaf key={`l${i}`} deg={deg} i={i} />
      ))}
      {rightDeg.map((deg, i) => (
        <Leaf key={`r${i}`} deg={deg} i={i} />
      ))}
    </svg>
  )
}

/* ─── Animated confetti ──────────────────────────────────────────────────── */
const CONFETTI = [
  { x: "9%", y: "7%", color: "#fbbf24", w: 7, h: 5, r: 28, dy: -12, dur: 3.2 },
  { x: "83%", y: "5%", color: "#34d399", w: 5, h: 7, r: 44, dy: -8, dur: 2.8 },
  { x: "4%", y: "32%", color: "#f87171", w: 5, h: 5, r: 62, dy: -15, dur: 3.6 },
  {
    x: "88%",
    y: "27%",
    color: "#60a5fa",
    w: 6,
    h: 4,
    r: 15,
    dy: -10,
    dur: 2.5,
  },
  { x: "13%", y: "68%", color: "#a78bfa", w: 4, h: 6, r: 73, dy: -6, dur: 4.0 },
  {
    x: "79%",
    y: "63%",
    color: "#fb923c",
    w: 6,
    h: 4,
    r: 38,
    dy: -14,
    dur: 3.1,
  },
  { x: "48%", y: "2%", color: "#34d399", w: 5, h: 5, r: 20, dy: -9, dur: 2.9 },
  {
    x: "68%",
    y: "78%",
    color: "#fbbf24",
    w: 7,
    h: 5,
    r: 52,
    dy: -11,
    dur: 3.5,
  },
  { x: "24%", y: "14%", color: "#f472b6", w: 4, h: 6, r: 33, dy: -7, dur: 3.8 },
  {
    x: "72%",
    y: "42%",
    color: "#60a5fa",
    w: 4,
    h: 4,
    r: 48,
    dy: -13,
    dur: 2.7,
  },
  { x: "35%", y: "88%", color: "#fb923c", w: 5, h: 4, r: 18, dy: -5, dur: 4.2 },
  {
    x: "55%",
    y: "75%",
    color: "#a78bfa",
    w: 4,
    h: 6,
    r: 66,
    dy: -10,
    dur: 3.3,
  },
]

function ConfettiLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      {CONFETTI.map((d, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: d.x,
            top: d.y,
            width: d.w,
            height: d.h,
            backgroundColor: d.color,
            borderRadius: 1,
            opacity: 0.75,
          }}
          animate={{
            y: [0, d.dy, 0],
            rotate: [d.r, d.r + 25, d.r - 15, d.r],
            opacity: [0.75, 0.9, 0.6, 0.75],
          }}
          transition={{
            duration: d.dur,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.18,
          }}
        />
      ))}
    </div>
  )
}

/* ─── Rank styles ────────────────────────────────────────────────────────── */
const RANK_STYLE = {
  1: {
    card: "bg-gradient-to-b from-amber-50 via-yellow-50 to-amber-50 border-yellow-300 dark:from-yellow-500/15 dark:via-amber-500/10 dark:to-yellow-500/15 dark:border-yellow-500/30",
    badge:
      "bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-amber-200 dark:shadow-none",
    laurel: "#f59e0b",
    earningsBox:
      "bg-yellow-50 border-yellow-300 dark:bg-yellow-500/10 dark:border-yellow-500/30",
    earningsLbl: "text-amber-600 dark:text-yellow-400",
    earningsTxt: "text-amber-700 dark:text-yellow-300",
    statBg: "bg-white/80 dark:bg-slate-800/60",
    statBorder: "border-yellow-100 dark:border-yellow-900/30",
    scale: "sm:scale-105",
    order: "sm:order-2",
    shadow: "shadow-lg shadow-amber-100 dark:shadow-amber-900/20",
  },
  2: {
    card: "bg-white border-slate-200 dark:bg-slate-800/60 dark:border-slate-700",
    badge: "bg-gradient-to-r from-slate-400 to-slate-500 text-white",
    laurel: "#94a3b8",
    earningsBox:
      "bg-slate-50 border-slate-200 dark:bg-slate-700/50 dark:border-slate-600",
    earningsLbl: "text-slate-500 dark:text-slate-400",
    earningsTxt: "text-slate-700 dark:text-slate-200",
    statBg: "bg-slate-50 dark:bg-slate-700/40",
    statBorder: "border-slate-100 dark:border-slate-700",
    scale: "",
    order: "sm:order-1",
    shadow: "shadow-sm",
  },
  3: {
    card: "bg-white border-orange-100 dark:bg-slate-800/60 dark:border-orange-500/20",
    badge: "bg-gradient-to-r from-orange-400 to-amber-500 text-white",
    laurel: "#fb923c",
    earningsBox:
      "bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/20",
    earningsLbl: "text-orange-500 dark:text-orange-400",
    earningsTxt: "text-orange-600 dark:text-orange-300",
    statBg: "bg-slate-50 dark:bg-slate-700/40",
    statBorder: "border-slate-100 dark:border-slate-700",
    scale: "",
    order: "sm:order-3",
    shadow: "shadow-sm",
  },
} as const

/* ─── Entry variants per rank ────────────────────────────────────────────── */
const CARD_VARIANTS: Record<1 | 2 | 3, { hidden: object; visible: object }> = {
  1: {
    hidden: { opacity: 0, y: 60, scale: 0.9 },
    visible: { opacity: 1, y: 0, scale: 1 },
  },
  2: {
    hidden: { opacity: 0, x: -60, y: 20 },
    visible: { opacity: 1, x: 0, y: 0 },
  },
  3: {
    hidden: { opacity: 0, x: 60, y: 20 },
    visible: { opacity: 1, x: 0, y: 0 },
  },
}

interface PodiumCardProps {
  earner: TopEarner
  rank: 1 | 2 | 3
}

function PodiumCard({ earner, rank }: PodiumCardProps) {
  const medal = MEDALS[rank]
  const style = RANK_STYLE[rank]
  const status = STATUS_CONFIG[earner.status] ?? STATUS_CONFIG.active
  const countedEarnings = useCountUp(earner.earnings, 1600, rank * 120)

  const cardDelay = rank === 1 ? 0.1 : rank === 2 ? 0.25 : 0.4

  return (
    <motion.div
      variants={CARD_VARIANTS[rank]}
      initial="hidden"
      animate="visible"
      transition={{
        delay: cardDelay,
        type: "spring",
        stiffness: 160,
        damping: 18,
      }}
      whileHover={{
        y: -6,
        transition: { type: "spring", stiffness: 300, damping: 20 },
      }}
      className={`relative overflow-hidden rounded-2xl border flex flex-col items-center text-center p-5 cursor-default ${style.card} ${style.order} ${style.scale} ${style.shadow}`}
    >
      {rank === 1 && <ConfettiLayer />}

      <div className="relative z-10 flex w-full flex-col items-center">
        {/* Rank badge — bounces in */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: cardDelay + 0.15,
            type: "spring",
            stiffness: 300,
            damping: 15,
          }}
          className={`mb-4 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-widest shadow-sm ${style.badge}`}
        >
          <span>{medal.crown}</span>
          <span>{medal.label} Place</span>
        </motion.div>

        {/* Avatar + laurel */}
        <div className="relative mb-3" style={{ width: 170, height: 170 }}>
          {/* Laurel — slow spin pulse */}
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: [0, 4, -4, 0], scale: [1, 1.03, 1] }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: cardDelay,
            }}
          >
            <AwardLaurel color={style.laurel} size={170} />
          </motion.div>

          {/* Avatar + crown */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {rank === 1 && (
                <motion.span
                  className="absolute -top-6 left-1/2 -translate-x-1/2 select-none text-4xl leading-none"
                  animate={{ y: [0, -7, 0], rotate: [-5, 5, -5] }}
                  transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  👑
                </motion.span>
              )}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: cardDelay + 0.3,
                  type: "spring",
                  stiffness: 200,
                  damping: 14,
                }}
              >
                <MemberAvatar
                  src={earner.avatar}
                  name={earner.name}
                  size="h-20 w-20 text-xl"
                  ringCls={`${medal.ring} ring-offset-2`}
                  bgCls={medal.bg}
                />
              </motion.div>
            </div>
          </div>
        </div>

        {/* Name + email */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: cardDelay + 0.4 }}
        >
          <p className="text-sm font-black leading-tight text-slate-800 dark:text-white">
            {earner.name}
          </p>
          <p className="mt-0.5 max-w-40 truncate text-xs text-slate-400 dark:text-slate-500">
            {earner.email}
          </p>
        </motion.div>

        {/* Tier badge */}
        <motion.div
          className="mt-2.5"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: cardDelay + 0.5,
            type: "spring",
            stiffness: 250,
          }}
        >
          <TierBadge tier={earner.tier} sizeClassName="h-14 w-14" />
        </motion.div>

        {/* Earnings — count-up */}
        <motion.div
          className={`mt-3 w-full rounded-xl border px-4 py-3 ${style.earningsBox}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: cardDelay + 0.55 }}
        >
          <p
            className={`mb-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.earningsLbl}`}
          >
            Total Earnings
          </p>
          <p className={`text-xl font-black tabular-nums ${style.earningsTxt}`}>
            {php(countedEarnings)}
          </p>
        </motion.div>

        {/* Mini stats — staggered */}
        <div className="mt-2.5 w-full grid grid-cols-3 gap-1.5">
          {[
            {
              icon: (
                <ShoppingBag className="mx-auto mb-1 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              ),
              label: "Orders",
              value: earner.orders,
              custom: null,
            },
            {
              icon: (
                <Users className="mx-auto mb-1 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              ),
              label: "Referrals",
              value: earner.referrals,
              custom: null,
            },
            {
              icon: (
                <span
                  className={`mx-auto mb-1 block h-3.5 w-3.5 rounded-full ${status.dot}`}
                />
              ),
              label: "Status",
              value: null,
              custom: (
                <p className={`mt-0.5 text-xs font-bold ${status.text}`}>
                  {status.label}
                </p>
              ),
            },
          ].map((stat, si) => (
            <motion.div
              key={stat.label}
              className={`rounded-xl border py-2 ${style.statBg} ${style.statBorder}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: cardDelay + 0.62 + si * 0.07,
                type: "spring",
                stiffness: 220,
              }}
            >
              {stat.icon}
              <p className="text-[10px] leading-none text-slate-400 dark:text-slate-500">
                {stat.label}
              </p>
              {stat.custom ?? (
                <p className="mt-0.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                  {stat.value}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Podium container ───────────────────────────────────────────────────── */
interface TopEarnersPodiumProps {
  top3: TopEarner[]
  isLoading?: boolean
}

export default function TopEarnersPodium({
  top3,
  isLoading,
}: TopEarnersPodiumProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[2, 1, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="h-6 w-24 rounded-full bg-slate-100 dark:bg-slate-700" />
              <div className="h-42.5 w-42.5 rounded-full bg-slate-100 dark:bg-slate-700" />
              <div className="h-4 w-28 rounded bg-slate-100 dark:bg-slate-700" />
              <div className="h-3 w-20 rounded bg-slate-100 dark:bg-slate-700" />
              <div className="h-14 w-full rounded-xl bg-slate-100 dark:bg-slate-700" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (top3.length === 0) return null

  const ordered: (TopEarner | undefined)[] = [top3[1], top3[0], top3[2]]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Podium
          </span>
          <span className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {top3.length} of {top3.length} shown
          </span>
        </div>
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-3">
          {ordered.map((earner) => {
            if (!earner) return null
            const rank = (
              earner === top3[0] ? 1 : earner === top3[1] ? 2 : 3
            ) as 1 | 2 | 3
            return <PodiumCard key={earner.id} earner={earner} rank={rank} />
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
