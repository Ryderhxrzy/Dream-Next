"use client"

import { useState } from "react"
import { motion } from "framer-motion"

type BlogFaqAccordionProps = {
  items: Array<{
    question: string
    answer: string
  }>
}

export function BlogFaqAccordion({ items }: BlogFaqAccordionProps) {
  const [openIndexes, setOpenIndexes] = useState<number[]>([0])

  const toggleItem = (index: number) => {
    setOpenIndexes((current) =>
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index],
    )
  }

  return (
    <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-[#e4d8ca] bg-white">
      {items.map((item, index) => {
        const isOpen = openIndexes.includes(index)
        const hasAnswer = item.answer.trim().length > 0

        return (
          <div
            key={`${item.question}-${index}`}
            className="border-b border-[#e4d8ca] last:border-b-0"
          >
            <button
              type="button"
              onClick={() => toggleItem(index)}
              className="flex w-full items-center justify-between gap-5 px-5 py-5 text-left transition-colors hover:bg-[#fbf8f3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c59b57]/35"
              aria-expanded={isOpen}
            >
              <span>
                <span className="block text-base font-medium text-[var(--foreground)]">
                  {item.question}
                </span>
                {hasAnswer && !isOpen ? (
                  <span className="mt-1 block text-xs tracking-widest text-[var(--accent)] uppercase">
                    View answer
                  </span>
                ) : null}
              </span>
              <motion.svg
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 shrink-0 rounded-full border border-[#e4d8ca] p-2 text-[var(--foreground)]"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </motion.svg>
            </button>

            {hasAnswer ? (
              <div
                className={`grid overflow-hidden bg-[#fbf8f3] transition-[grid-template-rows,opacity] duration-300 ease-out ${
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <motion.p
                    animate={{ y: isOpen ? 0 : -6 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="px-5 pb-5 text-sm leading-7 text-[var(--muted)]"
                  >
                    {item.answer}
                  </motion.p>
                </div>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
