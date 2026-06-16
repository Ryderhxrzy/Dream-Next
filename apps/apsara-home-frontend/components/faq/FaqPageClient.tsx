"use client"

import { useState } from "react"
import type { Category } from "@/store/api/categoriesApi"
import { AnimatePresence, motion } from "framer-motion"

import Footer from "@/components/landing-page/Footer"
import Navbar from "@/components/layout/Navbar"
import TopBar from "@/components/layout/TopBar"

const FAQ_CATEGORIES = [
  {
    label: "Orders & Payments",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
    items: [
      {
        question: "How can I place an order?",
        answer:
          "Browse our website, select the desired furniture item, choose any customization options if available, and add it to your cart. Proceed to checkout, provide your shipping and payment details, and confirm the order. You will receive an order confirmation via email.",
      },
      {
        question: "What payment methods do you accept?",
        answer:
          "We accept major credit cards (Visa, Mastercard, American Express), debit cards, PayPal, and bank transfers. Choose the payment option that suits you best during checkout.",
      },
      {
        question: "Can I cancel or modify my order after it has been placed?",
        answer:
          "Contact our customer service as soon as possible. We will do our best to accommodate your request if the order has not entered the manufacturing or shipping process. Once manufacturing has started, cancellations or modifications may not be possible.",
      },
      {
        question: "How can I track my order?",
        answer:
          "Visit our Track Order page at /track-order and enter your order details to see the current status of your shipment.",
      },
    ],
  },
  {
    label: "Products & Customization",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    items: [
      {
        question: "Can I customize my furniture order?",
        answer:
          "Yes, we offer customization options for specific furniture items — different colors, materials, sizes, or configurations. Available customization options are indicated on each product page.",
      },
      {
        question:
          "How long does it take to manufacture and deliver furniture orders?",
        answer:
          "Typically 1–2 days for laminated and metal furniture, and 3–5 days for sofa and upholstered furniture. Timeframes may vary based on product availability and your location.",
      },
      {
        question: "Do you offer assembly services?",
        answer:
          "Yes, AF Home provides professional assembly services. We also include detailed assembly instructions with each item. Refer to the AF Home Assembly Service Pricelist for rates.",
      },
      {
        question: "Do you provide international shipping?",
        answer:
          "Currently we are not shipping products outside the Philippines.",
      },
    ],
  },
  {
    label: "Returns & Refunds",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
      </svg>
    ),
    items: [
      {
        question: "What is your return policy?",
        answer:
          "Our return policy lasts 1 week from purchase. Items must be unused, in original condition, and in original packaging. A receipt or proof of purchase is required. Non-returnable items include gift cards.\n\nPartial refunds may apply for items not in original condition, damaged, or missing parts not due to our error, or items returned more than 30 days after delivery.",
      },
      {
        question: "How do refunds work?",
        answer:
          "Once your return is received and inspected, we will notify you of approval or rejection. If approved, your refund will be applied to your original payment method within a certain number of days.\n\nIf you haven't received a refund, check your bank account, then contact your credit card company or bank. If you still need help, email afhome.team@gmail.com.",
      },
      {
        question: "Can I exchange a defective or damaged item?",
        answer:
          "We replace items only if they are defective or damaged. Email afhome.team@gmail.com to arrange an exchange for the same item.\n\nNote: Sale items cannot be refunded. You are responsible for return shipping costs, which are non-refundable.",
      },
      {
        question: "What should I do if my furniture arrives damaged?",
        answer:
          "Notify our customer service immediately with relevant details and photos of the damage. We will promptly arrange a replacement or initiate a refund.",
      },
    ],
  },
]

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export default function FaqPageClient({
  initialCategories = [],
}: {
  initialCategories?: Category[]
}) {
  const [openKey, setOpenKey] = useState<string | null>("0-0")
  const [activeCategory, setActiveCategory] = useState<number>(0)

  const toggle = (key: string) => setOpenKey(openKey === key ? null : key)

  const totalFaqs = FAQ_CATEGORIES.reduce((sum, c) => sum + c.items.length, 0)

  return (
    <>
      <TopBar />
      <Navbar initialCategories={initialCategories} />

      <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Hero */}
        <section className="bg-linear-to-br from-sky-500 to-cyan-600 text-white">
          <div className="container mx-auto px-4 py-12 md:py-16">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold tracking-widest uppercase opacity-70">
                    AF Home · Help Center
                  </p>
                  <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">
                    Frequently Asked Questions
                  </h1>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">
                    Find answers to common questions about orders, products,
                    shipping, and returns.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="rounded-xl bg-white/15 px-4 py-2.5 text-center">
                  <p className="text-sm font-bold">{totalFaqs}</p>
                  <p className="text-[10px] font-medium opacity-70">
                    Questions
                  </p>
                </div>
                <div className="rounded-xl bg-white/15 px-4 py-2.5 text-center">
                  <p className="text-sm font-bold">{FAQ_CATEGORIES.length}</p>
                  <p className="text-[10px] font-medium opacity-70">
                    Categories
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="container mx-auto px-4 py-10 md:py-14">
          <div className="mx-auto max-w-4xl">
            {/* Category tabs */}
            <div className="mb-6 flex flex-wrap gap-2">
              {FAQ_CATEGORIES.map((cat, i) => (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => setActiveCategory(i)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    activeCategory === i
                      ? "bg-sky-600 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-sky-700 dark:hover:bg-sky-900/20"
                  }`}
                >
                  <span
                    className={
                      activeCategory === i
                        ? "text-white"
                        : "text-sky-500 dark:text-sky-400"
                    }
                  >
                    {cat.icon}
                  </span>
                  {cat.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      activeCategory === i
                        ? "bg-white/25 text-white"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {cat.items.length}
                  </span>
                </button>
              ))}
            </div>

            {/* FAQ accordion */}
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-3"
            >
              {FAQ_CATEGORIES[activeCategory].items.map((faq, i) => {
                const key = `${activeCategory}-${i}`
                const isOpen = openKey === key
                return (
                  <div
                    key={key}
                    className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition dark:bg-slate-900/60 ${
                      isOpen
                        ? "border-sky-300 dark:border-sky-700"
                        : "border-slate-200 hover:border-sky-200 dark:border-slate-800 dark:hover:border-sky-800"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition ${
                            isOpen
                              ? "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span
                          className={`text-sm font-semibold transition ${isOpen ? "text-sky-700 dark:text-sky-300" : "text-slate-800 dark:text-slate-100"}`}
                        >
                          {faq.question}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 transition ${isOpen ? "text-sky-500" : "text-slate-400 dark:text-slate-500"}`}
                      >
                        <ChevronIcon isOpen={isOpen} />
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-sky-100 bg-sky-50/40 px-5 pt-4 pb-5 dark:border-sky-900/30 dark:bg-sky-950/10">
                            <p className="text-sm leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-300">
                              {faq.answer}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </motion.div>

            {/* Still have questions */}
            <div className="mt-8 overflow-hidden rounded-2xl border border-sky-200 bg-linear-to-br from-sky-50 to-cyan-50 dark:border-sky-900/40 dark:from-sky-950/30 dark:to-cyan-950/30">
              <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Still have questions?
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Our team is happy to help you out.
                    </p>
                  </div>
                </div>
                <a
                  href="/contact-us"
                  className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
                >
                  Contact Us
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
