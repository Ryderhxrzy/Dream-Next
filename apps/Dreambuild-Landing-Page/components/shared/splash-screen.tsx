"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const letters = "DREAMBUILD".split("");

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#0d0d0d]">

      {/* ── Lamp pendulum ── */}
      <motion.div
        style={{ transformOrigin: "top center" }}
        initial={{ rotate: -40 }}
        animate={{ rotate: [-40, 40, -22, 22, -10, 10, -3, 3, 0] }}
        transition={{
          duration: 2.8,
          ease: "easeOut",
          times: [0, 0.22, 0.42, 0.57, 0.69, 0.80, 0.88, 0.94, 1],
        }}
        className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center z-20"
      >
        {/* Cord */}
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 130 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-px bg-white/30"
        />

        {/* Shade + bulb */}
        <motion.div
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 0.35, delay: 0.4, ease: "backOut" }}
          style={{ transformOrigin: "top center" }}
          className="flex flex-col items-center"
        >
          <div
            style={{ clipPath: "polygon(12% 0%, 88% 0%, 100% 100%, 0% 100%)" }}
            className="h-9 w-16 bg-gradient-to-b from-[#c9a020] to-[#8a6a08]"
          />
          {/* Bulb — blinks before staying on */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 0.7, 0, 0.9, 0, 1] }}
            transition={{
              duration: 0.7,
              delay: 2.85,
              times: [0, 0.1, 0.25, 0.42, 0.6, 0.78, 1],
            }}
            className="h-4 w-4 rounded-full bg-[#ffe066] shadow-[0_0_12px_6px_rgba(255,220,60,0.8)]"
          />
        </motion.div>
      </motion.div>

      {/* ── Screen flicker flashes ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.18, 0, 0.28, 0, 0.08] }}
        transition={{
          duration: 0.65,
          delay: 2.85,
          times: [0, 0.18, 0.38, 0.58, 0.80, 1],
        }}
        style={{
          background: "radial-gradient(circle at 50% 25%, rgba(255,210,50,0.6), transparent 60%)",
        }}
      />

      {/* ── Soft light beam from bulb ── */}
      <motion.div
        className="absolute pointer-events-none z-10"
        style={{
          top: 168,
          left: "50%",
          width: 500,
          height: 480,
          marginLeft: -250,
          transformOrigin: "top center",
        }}
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ opacity: 1, scaleY: 1 }}
        transition={{ duration: 0.9, delay: 3.45, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div
          className="h-full w-full"
          style={{
            background:
              "radial-gradient(ellipse 55% 100% at 50% 0%, rgba(255,210,50,0.22) 0%, rgba(255,200,50,0.10) 35%, rgba(255,190,40,0.04) 65%, transparent 100%)",
          }}
        />
      </motion.div>

      {/* ── Bright hotspot at bulb ── */}
      <motion.div
        className="absolute pointer-events-none z-10"
        style={{ top: 158, left: "50%", width: 120, height: 120, marginLeft: -60 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 3.5 }}
      >
        <div
          className="h-full w-full"
          style={{
            background:
              "radial-gradient(circle at 50% 20%, rgba(255,230,80,0.5) 0%, rgba(255,210,50,0.2) 40%, transparent 70%)",
          }}
        />
      </motion.div>

      {/* ── Logo reveal ── */}
      <motion.div
        className="relative z-20"
        initial={{ opacity: 0, scale: 0.55, filter: "brightness(0) blur(4px)" }}
        animate={{ opacity: 1, scale: 1, filter: "brightness(1) blur(0px)" }}
        transition={{ duration: 0.75, delay: 3.5, ease: [0.34, 1.4, 0.64, 1] }}
      >
        {/* Pulse rings */}
        <motion.div
          className="absolute -inset-3 rounded-3xl border border-[#ffe066]/30"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: [0, 0.8, 0], scale: [0.85, 1.2, 1.4] }}
          transition={{ duration: 1.4, delay: 3.8, ease: "easeOut" }}
        />
        <motion.div
          className="absolute -inset-6 rounded-3xl border border-[#ffe066]/15"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: [0, 0.5, 0], scale: [0.85, 1.2, 1.5] }}
          transition={{ duration: 1.6, delay: 3.95, ease: "easeOut" }}
        />

        <div className="relative">
          <Image
            src="/Images/header.jpg"
            alt="Dreambuild"
            width={140}
            height={140}
            className="rounded-2xl shadow-[0_0_70px_rgba(255,200,50,0.4)]"
            priority
          />
          <div className="absolute inset-0 rounded-2xl ring-1 ring-[#ffe066]/40" />
        </div>
      </motion.div>

      {/* ── DREAMBUILD letters ── */}
      <div className="relative z-20 mt-8 flex items-center gap-[0.12em]">
        {letters.map((letter, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.38,
              delay: 4.15 + i * 0.055,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="text-xl font-medium tracking-[0.28em] text-white"
          >
            {letter}
          </motion.span>
        ))}
      </div>

      {/* ── Tagline ── */}
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 4.85 }}
        className="relative z-20 mt-2.5 text-[10px] font-medium tracking-[0.35em] text-white/30 uppercase"
      >
        Interior Design Studio
      </motion.p>

      {/* ── Loading dots ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 5.1 }}
        className="relative z-20 mt-10 flex items-center gap-2"
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.4, 1] }}
            transition={{
              duration: 0.9,
              repeat: Infinity,
              delay: i * 0.18,
              ease: "easeInOut",
            }}
            className="h-1.5 w-1.5 rounded-full bg-[#ffe066]/50"
          />
        ))}
      </motion.div>

    </div>
  );
}
