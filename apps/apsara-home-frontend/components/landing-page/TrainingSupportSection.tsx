"use client"

import { motion } from "framer-motion"
import {
  Calendar,
  GraduationCap,
  Mic,
  PlayCircle,
  Users,
  Video,
} from "lucide-react"

export default function TrainingSupportSection() {
  const highlights = [
    {
      icon: GraduationCap,
      text: "Affiliate onboarding sessions",
      color: "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300",
    },
    {
      icon: Users,
      text: "Product & selling trainings",
      color:
        "bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-300",
    },
    {
      icon: Video,
      text: "Content and marketing tips",
      color:
        "bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-300",
    },
    {
      icon: Mic,
      text: "Online and in-person events",
      color: "bg-pink-100 dark:bg-pink-500/10 text-pink-600 dark:text-pink-300",
    },
  ]

  const events = [
    { day: "15", month: "FEB", title: "Affiliate Bootcamp", time: "2:00 PM" },
    { day: "18", month: "FEB", title: "Content Mastery", time: "4:00 PM" },
    { day: "22", month: "FEB", title: "Live Q&A Session", time: "1:00 PM" },
  ]

  const webinars = [
    {
      title: "Getting Started Guide",
      image: "/Images/landing/get-started.png",
      duration: "15:00",
      category: "Onboarding",
    },
    {
      title: "Advanced Sales Tactics",
      image: "/Images/landing/sales-tactics.png",
      duration: "45:30",
      category: "Sales",
    },
    {
      title: "Social Media Algorithms",
      image: "/Images/landing/social-media-algorithms.png",
      duration: "32:00",
      category: "Social",
    },
  ]

  return (
    <section
      id="training"
      className="relative overflow-hidden !bg-white py-16 md:py-24 dark:!bg-gray-950"
    >
      {/* Background Decor */}
      <div className="pointer-events-none absolute top-0 left-0 h-full w-full overflow-hidden">
        <div className="absolute top-10 -left-10 h-56 w-56 rounded-full bg-orange-50 opacity-40 mix-blend-multiply blur-3xl filter sm:top-20 sm:-left-20 sm:h-72 sm:w-72 sm:opacity-50 md:h-80 md:w-80" />
        <div className="absolute -right-10 bottom-10 h-56 w-56 rounded-full bg-blue-50 opacity-40 mix-blend-multiply blur-3xl filter sm:-right-20 sm:bottom-20 sm:h-72 sm:w-72 sm:opacity-50 md:h-80 md:w-80" />
      </div>

      <div className="relative z-10 container mx-auto px-4">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Text Content */}
          <div className="order-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-6 inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-1.5 text-sm font-semibold text-orange-700 dark:bg-orange-500/10 dark:text-orange-300"
            >
              <GraduationCap size={14} />
              TRAININGS, EVENTS & SUPPORT
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mb-6 text-4xl leading-tight font-bold text-gray-900 md:text-5xl dark:text-white"
            >
              You’re Never Doing <br />
              <span className="text-orange-600">This Alone.</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="mb-10 text-xl leading-relaxed text-gray-600 dark:text-gray-400"
            >
              AF Home provides ongoing training, tools, and events to help
              affiliates succeed—whether you’re a beginner or experienced
              seller.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="grid gap-6 sm:grid-cols-2"
            >
              {highlights.map((item, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${item.color}`}
                  >
                    <item.icon size={22} />
                  </div>
                  <div className="pt-2">
                    <h4 className="mb-2 text-lg leading-none font-bold text-gray-900 dark:text-white">
                      {item.text}
                    </h4>
                    <div className="h-1 w-12 rounded-full bg-gray-100 dark:bg-gray-700" />
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Visual Content - Calendar & Webinar Library */}
          <div className="perspective-1000 relative order-2">
            {/* Main Card - Webinar Grid */}
            <motion.div
              initial={{ opacity: 0, x: 50, rotateY: -5 }}
              whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative z-10 rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-6 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                  <Video size={20} className="text-orange-500" />
                  Training Library
                </h3>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  50+ Videos
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {webinars.map((webinar, index) => (
                  <div key={index} className="group cursor-pointer">
                    <div className="relative mb-2 aspect-video overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                      <img
                        src={webinar.image}
                        alt={webinar.title}
                        className="h-full w-full object-cover opacity-70 transition-transform duration-500 group-hover:scale-110 group-hover:opacity-100"
                      />
                      <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/0" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                          <PlayCircle
                            size={16}
                            className="fill-white text-white"
                          />
                        </div>
                      </div>
                      <div className="absolute right-1 bottom-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                        {webinar.duration}
                      </div>
                    </div>
                    <h4 className="mb-1 line-clamp-1 text-sm leading-tight font-semibold text-gray-900 transition-colors group-hover:text-orange-400 dark:text-white">
                      {webinar.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {webinar.category}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Floating Calendar Card */}
            <motion.div
              initial={{ opacity: 0, y: 50, x: -20 }}
              whileInView={{ opacity: 1, y: 0, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="relative z-20 mt-6 w-full rounded-2xl border border-gray-100 bg-white p-5 shadow-xl sm:absolute sm:-bottom-10 sm:-left-10 sm:mt-0 sm:w-64 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-orange-500" />
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Upcoming Events
                </h4>
              </div>

              <div className="space-y-3">
                {events.map((event, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="min-w-[3rem] rounded-lg bg-orange-50 p-2 text-center">
                      <span className="block text-xs font-bold text-orange-600">
                        {event.month}
                      </span>
                      <span className="block text-lg leading-none font-bold text-gray-900 dark:text-white">
                        {event.day}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm leading-tight font-semibold text-gray-900 dark:text-white">
                        {event.title}
                      </p>
                      <p className="text-xs text-gray-500">{event.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
