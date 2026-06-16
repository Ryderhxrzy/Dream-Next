"use client"

import { motion } from "framer-motion"

type Mode = "login" | "signup"

interface AuthTabsProps {
  mode: Mode
  setMode: (mode: Mode) => void
}
const AuthTabs = ({ mode, setMode }: AuthTabsProps) => {
  const tabs: Array<{ id: Mode; label: string }> = [
    { id: "login", label: "Sign In" },
    { id: "signup", label: "Sign Up" },
  ]

  return (
    <div className="mb-8 flex w-full gap-1 rounded-xl bg-black/10 p-1 dark:bg-white/10">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setMode(tab.id)}
          className={`relative flex-1 cursor-pointer rounded-lg px-6 py-2 text-sm font-semibold whitespace-nowrap transition-colors duration-200 ${
            mode === tab.id
              ? "text-white"
              : "text-gray-600 hover:text-gray-900 dark:text-white/60 dark:hover:text-white/90"
          }`}
        >
          {mode === tab.id && (
            <motion.span
              layoutId="auto-tab"
              className="absolute inset-0 rounded-lg bg-sky-500 shadow-lg"
              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className="relative z-10">{tab.label}</span>
        </button>
      ))}
    </div>
  )
}

export default AuthTabs
