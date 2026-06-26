"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Moon, Sun } from "lucide-react"

import { useTheme } from "@/components/theme/AppThemeProvider"

interface ThemeToggleProps {
  isScrolled?: boolean
  isHome?: boolean
}

export default function ThemeToggle({
  isScrolled = false,
  isHome = true,
}: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const isDark = resolvedTheme === "dark"

  if (!mounted) {
    return <div className="h-8 w-8" />
  }

  return (
    <div className="group relative">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label="Toggle dark mode"
        className={`cursor-pointer rounded-lg p-2 transition-colors ${
          isScrolled || !isHome
            ? "text-gray-500 hover:bg-amber-50 hover:text-amber-500 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-amber-400"
            : "text-white/70 hover:bg-white/10 hover:text-amber-400"
        }`}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </motion.button>
      <span className="pointer-events-none absolute top-full left-1/2 mt-2 -translate-x-1/2 rounded-lg bg-gray-900/90 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
        {isDark ? "Light Mode" : "Dark Mode"}
      </span>
    </div>
  )
}
