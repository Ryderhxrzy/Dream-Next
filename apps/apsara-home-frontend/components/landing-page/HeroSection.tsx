"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import {
  Armchair,
  ArrowDown,
  ArrowRight,
  Award,
  Coins,
  Home,
  Users,
} from "lucide-react"

import PrimaryButton from "@/components/ui/buttons/PrimaryButton"
import TransparentButton from "@/components/ui/buttons/TransparentButton"

const FloatingIcon = ({
  children,
  delay,
  x,
  y,
  className = "",
}: {
  children: React.ReactNode
  delay: number
  x: string
  y: string
  className?: string
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0 }}
    animate={{
      opacity: [0.4, 0.8, 0.4],
      y: [0, -20, 0],
      scale: [1, 1.1, 1],
    }}
    transition={{
      duration: 4,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
    className={`absolute ${x} ${y} z-10 text-white/30 ${className}`}
  >
    {children}
  </motion.div>
)

export default function HeroSection() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  })

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"])
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  return (
    <section
      ref={ref}
      className="relative h-screen min-h-[600px] overflow-hidden"
    >
      {/* Background Image with Parallax */}
      <motion.div
        style={{ y: backgroundY }}
        className="absolute inset-0 h-[120%] w-full"
      >
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/80 via-black/50 to-transparent md:bg-gradient-to-r" />
        <img
          src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1920&q=85"
          alt="Modern living room with elegant furniture"
          className="h-full w-full object-cover object-center"
        />
      </motion.div>

      {/* Floating Icons */}
      <FloatingIcon
        delay={0}
        x="right-[5%] md:right-[15%]"
        y="top-[15%] md:top-[20%]"
        className="hidden sm:block"
      >
        <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md md:p-4">
          <Coins className="h-8 w-8 text-yellow-400 md:h-10 md:w-10" />
        </div>
      </FloatingIcon>

      <FloatingIcon
        delay={1}
        x="right-[5%] md:right-[25%]"
        y="bottom-[20%] md:bottom-[30%]"
        className="hidden sm:block"
      >
        <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md md:p-4">
          <Home className="h-6 w-6 text-blue-400 md:h-8 md:w-8" />
        </div>
      </FloatingIcon>

      <FloatingIcon
        delay={2}
        x="right-[10%]"
        y="top-[50%]"
        className="hidden lg:block"
      >
        <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
          <Users size={36} className="text-green-400" />
        </div>
      </FloatingIcon>

      <FloatingIcon
        delay={1.5}
        x="left-[45%]"
        y="bottom-[20%]"
        className="hidden lg:block"
      >
        <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md">
          <Armchair size={28} className="text-orange-400" />
        </div>
      </FloatingIcon>

      <FloatingIcon
        delay={2.5}
        x="right-[35%]"
        y="top-[30%]"
        className="hidden lg:block"
      >
        <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md">
          <Award size={30} className="text-purple-400" />
        </div>
      </FloatingIcon>

      <FloatingIcon
        delay={3}
        x="right-[5%] md:right-[5%]"
        y="bottom-[40%]"
        className="hidden md:block"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 p-4 backdrop-blur-md">
          <span className="text-3xl font-bold text-white">₱</span>
        </div>
      </FloatingIcon>

      {/* Dotted Grid Overlay */}
      <div
        className="absolute inset-0 z-10 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle, #1A1A1A 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      />

      {/* Content */}
      <motion.div
        style={{ y: textY, opacity }}
        className="relative z-20 flex h-full items-center pt-28 md:pt-0"
      >
        <div className="container mx-auto w-full px-4">
          <div className="mx-auto max-w-4xl text-left md:mx-0">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.3,
                ease: [0.16, 1, 0.3, 1] as const,
              }}
              className="font-display mb-6 text-3xl leading-tight font-medium tracking-tight text-white sm:text-4xl md:mb-8 md:text-7xl lg:text-8xl"
            >
              Earn From Home.{" "}
              <span className="block md:inline">Build a Team.</span>{" "}
              <span className="block bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text font-bold text-transparent italic md:inline">
                Upgrade Lives.
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.4,
                ease: [0.16, 1, 0.3, 1] as const,
              }}
              className="font-body mb-8 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg md:mx-0 md:text-2xl"
            >
              AF Home is a home and lifestyle affiliate ecosystem where you earn
              commissions, enjoy lifetime discounts, and grow with a community.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.45,
                ease: [0.16, 1, 0.3, 1] as const,
              }}
              className="mb-10 inline-block rounded-full border border-white/10 bg-white/5 px-6 py-2 text-base font-medium text-white backdrop-blur-sm md:text-xl"
            >
              No inventory. No capital. Just real products, real earnings.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.5,
                ease: [0.16, 1, 0.3, 1] as const,
              }}
              className="flex w-auto flex-col items-start justify-start gap-4 sm:flex-row"
            >
              <PrimaryButton href="/login">
                Join as an Affiliate — It’s Free
                <ArrowRight size={20} />
              </PrimaryButton>
              <TransparentButton href="#how-it-works">
                See How It Works
                <ArrowDown
                  size={18}
                  className="hidden group-hover:inline-block"
                />
              </TransparentButton>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-10 w-6 justify-center rounded-full border-2 border-white/50"
        >
          <motion.div
            animate={{ y: [0, 12, 0], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="mt-2 h-3 w-1.5 rounded-full bg-white"
          />
        </motion.div>
      </motion.div>
    </section>
  )
}
