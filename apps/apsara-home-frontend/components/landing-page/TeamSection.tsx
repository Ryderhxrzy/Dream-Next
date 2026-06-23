"use client"

import { motion } from "framer-motion"
import {
  Briefcase,
  Share2,
  ShoppingBag,
  TrendingUp,
  User,
  UserPlus,
  Users,
  Video,
} from "lucide-react"

export default function TeamSection() {
  const keyPoints = [
    {
      icon: UserPlus,
      text: "Refer friends & professionals",
      desc: "Invite creators, sellers, and experts",
    },
    {
      icon: Users,
      text: "Grow together",
      desc: "Support your team and unlock opportunities",
    },
    {
      icon: TrendingUp,
      text: "Scalable income",
      desc: "Ideal for OFWs, freelancers & entrepreneurs",
    },
  ]

  // Network nodes data
  const networkNodes = [
    {
      icon: Video,
      label: "Creators",
      color: "bg-pink-100 text-pink-600",
      position: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",
    },
    {
      icon: Briefcase,
      label: "Pros",
      color: "bg-blue-100 text-blue-600",
      position: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
    },
    {
      icon: ShoppingBag,
      label: "Sellers",
      color: "bg-purple-100 text-purple-600",
      position: "top-1/2 right-0 translate-x-1/2 -translate-y-1/2",
    },
    {
      icon: User,
      label: "Friends",
      color: "bg-orange-100 text-orange-600",
      position: "top-1/2 left-0 -translate-x-1/2 -translate-y-1/2",
    },
  ]

  return (
    <section
      id="team"
      className="relative overflow-hidden bg-gray-50 py-24 dark:bg-gray-900"
    >
      {/* Background Elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-blob absolute top-1/2 right-0 h-96 w-96 rounded-full bg-blue-100 opacity-30 mix-blend-multiply blur-3xl filter" />
        <div className="animate-blob animation-delay-2000 absolute bottom-0 left-0 h-96 w-96 rounded-full bg-purple-100 opacity-30 mix-blend-multiply blur-3xl filter" />
      </div>

      <div className="relative z-10 container mx-auto px-4">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Visual Content - Network Diagram */}
          <div className="order-2 flex justify-center lg:order-1">
            <div className="relative h-[300px] w-[300px] md:h-[400px] md:w-[400px]">
              {/* Connecting Lines (SVG) */}
              <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full">
                <motion.g
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.5 }}
                >
                  {/* Lines radiating from center */}
                  <line
                    x1="50%"
                    y1="50%"
                    x2="50%"
                    y2="10%"
                    stroke="#CBD5E1"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                  />
                  <line
                    x1="50%"
                    y1="50%"
                    x2="50%"
                    y2="90%"
                    stroke="#CBD5E1"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                  />
                  <line
                    x1="50%"
                    y1="50%"
                    x2="90%"
                    y2="50%"
                    stroke="#CBD5E1"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                  />
                  <line
                    x1="50%"
                    y1="50%"
                    x2="10%"
                    y2="50%"
                    stroke="#CBD5E1"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                  />

                  {/* Outer Circle Ring */}
                  <circle
                    cx="50%"
                    cy="50%"
                    r="40%"
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="1"
                  />
                </motion.g>
              </svg>

              {/* Center Node (YOU) */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="absolute top-1/2 left-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              >
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-green-100 bg-white shadow-xl dark:border-green-900 dark:bg-gray-800">
                  <div className="absolute inset-0 animate-ping rounded-full bg-green-50 opacity-20" />
                  <img
                    src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100"
                    alt="You"
                    className="h-full w-full rounded-full object-cover p-1"
                  />
                  <div className="absolute -bottom-2 rounded-full bg-green-600 px-2 py-0.5 text-xs font-bold text-white">
                    YOU
                  </div>
                </div>
              </motion.div>

              {/* Surrounding Nodes */}
              {networkNodes.map((node, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + index * 0.1, type: "spring" }}
                  className={`absolute ${node.position} z-10 flex flex-col items-center`}
                >
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-full shadow-lg ${node.color} mb-2 bg-white`}
                  >
                    <node.icon size={24} />
                  </div>
                  <span className="rounded-md bg-white/80 px-2 py-0.5 text-sm font-semibold text-gray-600 shadow-sm backdrop-blur-sm dark:bg-gray-800/80 dark:text-gray-300">
                    {node.label}
                  </span>
                </motion.div>
              ))}

              {/* Floating "Invite Share Grow" badges */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute top-1/4 right-1/4 z-0 flex items-center gap-2 rounded-lg bg-white p-2 opacity-80 shadow-md dark:bg-gray-800"
              >
                <Share2 size={14} className="text-blue-500" />
                <span className="text-xs font-bold text-gray-500">Share</span>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
                className="absolute bottom-1/4 left-1/4 z-0 flex items-center gap-2 rounded-lg bg-white p-2 opacity-80 shadow-md dark:bg-gray-800"
              >
                <TrendingUp size={14} className="text-green-500" />
                <span className="text-xs font-bold text-gray-500">Grow</span>
              </motion.div>
            </div>
          </div>

          {/* Text Content */}
          <div className="order-1 text-center lg:order-2 lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-semibold text-blue-700"
            >
              <Users size={14} />
              BUILD A TEAM & REFERRAL SYSTEM
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mb-6 text-4xl leading-tight font-bold text-gray-900 md:text-5xl dark:text-white"
            >
              Build a Team. <br />
              <span className="text-blue-600">Grow Together.</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="mb-8 text-xl leading-relaxed text-gray-600 dark:text-gray-400"
            >
              Invite others to become affiliates and build your own network. The
              more your community grows, the more opportunities you unlock.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              {keyPoints.map((point, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <point.icon size={20} />
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-gray-900 dark:text-white">
                      {point.text}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {point.desc}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
