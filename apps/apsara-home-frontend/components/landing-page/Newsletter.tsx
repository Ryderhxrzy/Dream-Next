import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, Send, Sparkles } from "lucide-react"

import PrimaryButton from "@/components/ui/buttons/PrimaryButton"

export default function Newsletter() {
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setIsSubmitted(true)
      setTimeout(() => {
        setIsSubmitted(false)
        setEmail("")
      }, 4000)
    }
  }

  return (
    <section className="relative overflow-hidden bg-stone-50 py-24 md:py-32 dark:bg-gray-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, #2C5F4F 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: 0.2,
                ease: [0.34, 1.56, 0.64, 1] as const,
              }}
              className="bg-af-forest/10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
            >
              <Sparkles size={28} className="text-orange-500" />
            </motion.div>

            <h2 className="font-display mb-4 text-3xl font-semibold text-gray-900 md:text-4xl lg:text-5xl dark:text-white">
              Join Our Community
            </h2>
            <p className="mb-8 text-lg text-gray-600 dark:text-gray-400">
              Subscribe for exclusive offers, design inspiration, and first
              access to new collections.
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            onSubmit={handleSubmit}
            className="relative"
          >
            <AnimatePresence mode="wait">
              {!isSubmitted ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative"
                >
                  <div
                    className={`shadow-soft relative rounded-full bg-white p-2 transition-all duration-500 dark:border dark:border-gray-700 dark:bg-gray-800 ${
                      isFocused ? "shadow-soft-lg ring-af-forest/20 ring-2" : ""
                    }`}
                  >
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      placeholder="Enter your email address"
                      className="text-af-text placeholder-af-text-secondary font-body w-full bg-transparent px-6 py-4 pr-36 focus:outline-none dark:text-white dark:placeholder-gray-500"
                      required
                    />
                    <PrimaryButton
                      type="submit"
                      className="absolute top-1/2 right-2 -translate-y-1/2 !px-6 !py-3 !text-sm"
                    >
                      Subscribe
                      <Send size={16} />
                    </PrimaryButton>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-center gap-3 rounded-full bg-green-500 px-8 py-6 text-white"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.3, 1] }}
                    transition={{ duration: 0.5 }}
                  >
                    <Check size={24} />
                  </motion.div>
                  <span className="text-lg font-semibold">
                    Welcome to AFhome! Check your inbox.
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.form>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-4 text-sm text-gray-600 dark:text-gray-500"
          >
            By subscribing, you agree to our Privacy Policy. Unsubscribe
            anytime.
          </motion.p>
        </div>
      </div>
    </section>
  )
}
