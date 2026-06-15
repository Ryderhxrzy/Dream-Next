"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

import { SplashScreen } from "./splash-screen"

export function SplashWrapper() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const seen = sessionStorage.getItem("dreambuild_splash_seen")
    if (!seen) {
      setShow(true)
      sessionStorage.setItem("dreambuild_splash_seen", "1")
      // Hide after animation completes (~5.6s) + fade out duration (0.7s)
      const timer = setTimeout(() => setShow(false), 5600)
      return () => clearTimeout(timer)
    }
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999]"
        >
          <SplashScreen />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
