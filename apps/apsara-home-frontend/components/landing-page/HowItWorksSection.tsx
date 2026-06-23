"use client"

import { motion } from "framer-motion"
import { Share2, UserPlus, Wallet } from "lucide-react"

import PrimaryButton from "@/components/ui/buttons/PrimaryButton"

const steps = [
  {
    step: "01",
    icon: UserPlus,
    title: "Register for Free",
    description:
      "Sign up as an AF Home affiliate in minutes. No fees, no inventory, no capital required.",
    color: "bg-blue-100 text-blue-600",
    border: "border-blue-200",
  },
  {
    step: "02",
    icon: Share2,
    title: "Share Products",
    description:
      "Get your unique affiliate link. Share AF Home products to your family, friends, and social media followers.",
    color: "bg-orange-100 text-orange-600",
    border: "border-orange-200",
  },
  {
    step: "03",
    icon: Wallet,
    title: "Earn & Enjoy",
    description:
      "Collect commissions on every successful sale. Plus, enjoy lifetime discounts on all AF Home products for yourself.",
    color: "bg-green-100 text-green-600",
    border: "border-green-200",
  },
]

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="overflow-hidden bg-white py-24 dark:bg-gray-900"
    >
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full bg-orange-100 px-4 py-1.5 text-sm font-semibold text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
            SIMPLE PROCESS
          </span>
          <h2 className="mb-4 text-4xl leading-tight font-bold text-gray-900 md:text-5xl dark:text-white">
            How It Works
          </h2>
          <p className="mx-auto max-w-2xl text-xl text-gray-500 dark:text-gray-400">
            Start earning in 3 easy steps - no experience needed.
          </p>
        </motion.div>

        <div className="relative grid gap-8 md:grid-cols-3 md:gap-6">
          <div className="absolute top-14 right-[calc(16.67%+1rem)] left-[calc(16.67%+1rem)] z-0 hidden h-0.5 bg-gradient-to-r from-blue-200 via-orange-200 to-green-200 md:block" />

          {steps.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15, duration: 0.6 }}
              className="relative z-10 flex flex-col items-center text-center"
            >
              <div
                className={`h-28 w-28 rounded-full ${step.color} border-4 ${step.border} mb-6 flex flex-col items-center justify-center bg-white shadow-md dark:bg-gray-800`}
              >
                <step.icon size={36} className={step.color.split(" ")[1]} />
                <span className="mt-1 text-xs font-bold text-gray-400 dark:text-gray-500">
                  {step.step}
                </span>
              </div>

              <h3 className="mb-3 text-xl font-bold text-gray-900 dark:text-white">
                {step.title}
              </h3>
              <p className="max-w-xs leading-relaxed text-gray-500 dark:text-gray-400">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <PrimaryButton href="/login">
            Get Started - It&apos;s Free
          </PrimaryButton>
        </motion.div>
      </div>
    </section>
  )
}
