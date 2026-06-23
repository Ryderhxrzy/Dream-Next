"use client"

import { motion } from "framer-motion"
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Share2,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

export default function CommissionSection() {
  const steps = [
    {
      icon: User,
      title: "You",
      description: "Join as an affiliate",
      color: "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300",
      arrow: ArrowRight,
      arrowPos: "right",
    },
    {
      icon: Share2,
      title: "Share Link",
      description: "Post on social media",
      color:
        "bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-300",
      arrow: ArrowDown,
      arrowPos: "bottom",
    },
    {
      icon: User,
      title: "Customer",
      description: "Buys from your link",
      color:
        "bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-300",
      arrow: ArrowLeft,
      arrowPos: "left",
    },
    {
      icon: Wallet,
      title: "Commission",
      description: "You get paid!",
      color:
        "bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-300",
      arrow: null,
      arrowPos: null,
    },
  ]

  const benefits = [
    "Earn commissions on every successful order",
    "Track sales and earnings in real time",
    "No limit to how much you can earn",
    "Get paid while helping others upgrade their homes",
  ]

  return (
    <section
      id="earnings"
      className="relative overflow-hidden bg-gray-50 py-24 dark:bg-gray-900"
    >
      {/* Background Elements */}
      <div className="pointer-events-none absolute top-0 left-0 h-full w-full overflow-hidden">
        <div className="animate-blob absolute top-10 left-10 h-64 w-64 rounded-full bg-orange-200 opacity-20 mix-blend-multiply blur-3xl filter" />
        <div className="animate-blob animation-delay-2000 absolute top-10 right-10 h-64 w-64 rounded-full bg-purple-200 opacity-20 mix-blend-multiply blur-3xl filter" />
        <div className="animate-blob animation-delay-4000 absolute -bottom-32 left-20 h-64 w-64 rounded-full bg-pink-200 opacity-20 mix-blend-multiply blur-3xl filter" />
      </div>

      <div className="relative z-10 container mx-auto px-4">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Text Content */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-6 inline-block rounded-full bg-green-100 px-4 py-1.5 text-sm font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-300"
            >
              HOW YOU EARN
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mb-6 text-4xl leading-tight font-bold text-gray-900 md:text-5xl dark:text-white"
            >
              Earn Every Time <br />
              <span className="bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                You Share.
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="mb-8 text-xl leading-relaxed text-gray-600 dark:text-gray-400"
            >
              When someone buys using your affiliate link, you earn
              commissions—simple as that.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mb-10 grid gap-4"
            >
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-300">
                    <TrendingUp size={16} />
                  </div>
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    {benefit}
                  </span>
                </div>
              ))}
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="font-caveat inline-block rotate-1 text-2xl font-bold text-orange-600"
            >
              Your content. Your network. Your income.
            </motion.p>
          </div>

          {/* Flow Diagram & Visuals */}
          <div className="relative">
            <div className="relative z-10 grid gap-6">
              {/* Process Flow */}
              <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-2">
                {steps.map((step, index) => {
                  // Determine order for snake layout on desktop
                  // 0 -> 1
                  //      |
                  // 3 <- 2
                  const orderClass =
                    index === 0
                      ? "lg:order-1"
                      : index === 1
                        ? "lg:order-2"
                        : index === 2
                          ? "lg:order-4" // Customer moves to bottom right
                          : "lg:order-3" // Commission moves to bottom left

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.15 }}
                      className={`relative ${orderClass}`}
                    >
                      <Card className="relative z-10 h-full border-none shadow-lg transition-all duration-300 hover:shadow-xl">
                        <CardContent className="flex flex-col items-center p-6 text-center">
                          <div
                            className={`h-14 w-14 rounded-2xl ${step.color} mb-4 flex items-center justify-center`}
                          >
                            <step.icon size={28} />
                          </div>
                          <h3 className="mb-1 font-bold text-gray-900 dark:text-white">
                            {step.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {step.description}
                          </p>
                        </CardContent>
                      </Card>

                      {/* Connecting Arrows (Desktop Only) */}
                      {step.arrow && (
                        <div
                          className={`absolute z-20 hidden items-center justify-center text-gray-300 lg:flex ${step.arrowPos === "right" ? "top-1/2 -right-5 -translate-y-1/2" : ""} ${step.arrowPos === "bottom" ? "-bottom-5 left-1/2 -translate-x-1/2" : ""} ${step.arrowPos === "left" ? "top-1/2 -left-5 -translate-y-1/2" : ""} `}
                        >
                          <step.arrow size={24} strokeWidth={3} />
                        </div>
                      )}

                      {/* Mobile Arrow (Down for all except last) */}
                      {index < steps.length - 1 && (
                        <div className="absolute -bottom-5 left-1/2 z-20 flex -translate-x-1/2 text-gray-300 lg:hidden">
                          <ArrowDown size={20} />
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>

              {/* Dashboard Mockup Snippet */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
                className="relative mt-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                        Total Earnings
                      </p>
                      <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                        ₱15,450.00
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-500/10 dark:text-green-300">
                      <TrendingUp size={12} />
                      +12%
                    </div>
                  </div>

                  {/* Mock Chart Area */}
                  <div className="relative h-24 w-full overflow-hidden">
                    <svg
                      className="h-full w-full"
                      viewBox="0 0 100 40"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient
                          id="gradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#4ade80"
                            stopOpacity="0.2"
                          />
                          <stop
                            offset="100%"
                            stopColor="#4ade80"
                            stopOpacity="0"
                          />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,40 L0,30 C10,25 20,35 30,20 C40,5 50,25 60,15 C70,5 80,10 90,5 L100,0 L100,40 Z"
                        fill="url(#gradient)"
                      />
                      <path
                        d="M0,30 C10,25 20,35 30,20 C40,5 50,25 60,15 C70,5 80,10 90,5 L100,0"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-50 pt-4 dark:border-gray-700">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">
                        Clicks
                      </p>
                      <p className="font-semibold text-gray-700 dark:text-gray-200">
                        1,240
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">
                        Orders
                      </p>
                      <p className="font-semibold text-gray-700 dark:text-gray-200">
                        85
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">
                        Conversion
                      </p>
                      <p className="font-semibold text-gray-700 dark:text-gray-200">
                        6.8%
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
