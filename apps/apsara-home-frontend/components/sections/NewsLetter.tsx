"use client"

import { useState } from "react"
import { motion } from "framer-motion"

const NewsLetter = () => {
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) setSubscribed(true)
  }
  return (
    <section className="border-b border-gray-200 bg-gray-100 py-16 dark:border-gray-700 dark:bg-slate-900">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-orange-500/20 px-4 py-1.5 text-sm font-semibold text-orange-500 dark:text-orange-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,12 2,6" />
            </svg>
            Newsletter
          </div>
          <h2 className="mb-3 text-3xl font-bold text-gray-900 dark:text-white">
            Stay in the Loop
          </h2>
          <p className="mb-8 text-gray-600 dark:text-white/50">
            Get the exclusive deals, new arrivals & interior tips to your
            inbox.{" "}
          </p>

          {subscribed ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-2xl bg-green-500/20 px-6 py-4 font-medium text-green-600 dark:text-green-400"
            >
              🎉 You&apos;re subscribed! Welcome to AF Home family.
            </motion.div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mx-auto flex max-w-md gap-3"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 transition-all duration-300 placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500 focus:outline-none dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-white/40"
              />
              <button
                type="submit"
                className="cursor-pointer rounded-full bg-orange-500 px-8 py-3 text-base font-semibold text-white transition-all duration-200 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Subscribe
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  )
}

export default NewsLetter
