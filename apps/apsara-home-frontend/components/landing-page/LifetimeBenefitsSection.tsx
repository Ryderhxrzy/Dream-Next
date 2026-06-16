import { motion } from "framer-motion"
import { CheckCircle2, Coins, Home, Tag } from "lucide-react"

export default function LifetimeBenefitsSection() {
  const benefits = [
    {
      icon: Tag,
      text: "Exclusive member pricing",
      desc: "Get special rates on our entire catalog",
    },
    {
      icon: CheckCircle2,
      text: "Use discounts anytime",
      desc: "Valid 24/7, all year round",
    },
    {
      icon: Home,
      text: "Perfect for renovations",
      desc: "Save big on home upgrades",
    },
    {
      icon: Coins,
      text: "Maximize your margins",
      desc: "Buy low, sell at market price",
    },
  ]

  return (
    <section
      id="benefits"
      className="relative overflow-hidden !bg-white py-24 dark:!bg-gray-950"
    >
      <div className="relative z-10 container mx-auto px-4">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Text Content */}
          <div className="order-2 lg:order-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-6 inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-1.5 text-sm font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
            >
              <Tag size={14} />
              LIFETIME DISCOUNTS & PERSONAL BENEFITS
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mb-6 text-4xl leading-tight font-bold text-gray-900 md:text-5xl dark:text-white"
            >
              Save for Life, <br />
              <span className="text-sky-600">Not Just Once.</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="mb-10 text-xl leading-relaxed text-gray-600 dark:text-gray-400"
            >
              As an AF Home Affiliate, you enjoy lifetime member discounts on
              products-whether you're buying for yourself, your family, or your
              projects.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="grid gap-6 sm:grid-cols-2"
            >
              {benefits.map((benefit, index) => (
                <div key={index} className="flex gap-4">
                  <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-300">
                    <benefit.icon size={20} />
                  </div>
                  <div>
                    <h4 className="mb-1 font-bold text-gray-900 dark:text-white">
                      {benefit.text}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {benefit.desc}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Visual Content - Price Comparison */}
          <div className="perspective-1000 relative order-1 lg:order-2">
            <motion.div
              initial={{ opacity: 0, rotateY: 10, x: 20 }}
              whileInView={{ opacity: 1, rotateY: 0, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative z-10 mx-auto max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
            >
              {/* Product Image */}
              <div className="relative mb-6 h-56 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-900">
                <img
                  src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=2070"
                  alt="Modern Sofa"
                  className="h-full w-full object-cover"
                />
                <div className="absolute top-4 right-4 rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
                  MEMBER EXCLUSIVE
                </div>
              </div>

              <div className="mb-6">
                <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                  Living Room Collection
                </p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Modern Sectional Sofa
                </h3>
              </div>

              <div className="space-y-3">
                {/* Regular Price Row */}
                <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4 dark:bg-gray-700">
                  <span className="font-medium text-gray-500 dark:text-gray-300">
                    Regular Price
                  </span>
                  <span className="text-lg font-medium text-gray-400 line-through decoration-red-400">
                    ?25,000
                  </span>
                </div>

                {/* Member Price Row - Highlighted */}
                <div className="relative flex items-center justify-between overflow-hidden rounded-xl border-2 border-green-100 bg-green-50 p-4 dark:border-green-500/20 dark:bg-green-500/10">
                  <div className="relative z-10 flex items-center gap-2">
                    <div className="rounded-full bg-green-200 p-1.5 text-green-700 dark:bg-green-500/20 dark:text-green-300">
                      <Tag size={16} />
                    </div>
                    <span className="font-bold text-green-800 dark:text-green-200">
                      Your Price
                    </span>
                  </div>
                  <span className="relative z-10 text-2xl font-bold text-green-700 dark:text-green-300">
                    ?20,000
                  </span>

                  {/* Shimmer Effect */}
                  <div className="animate-shimmer absolute top-0 left-0 h-full w-full translate-x-[-200%] -skew-x-12 bg-gradient-to-r from-transparent via-white to-transparent opacity-50" />
                </div>
              </div>

              <div className="mt-6 flex items-end justify-between border-t border-gray-100 pt-5 dark:border-gray-700">
                <div>
                  <p className="text-xs font-semibold tracking-wider text-gray-600 uppercase dark:text-gray-400">
                    Total Savings
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Instant discount applied
                  </p>
                </div>
                <div className="text-right">
                  <span className="block text-3xl font-bold text-red-500">
                    ?5,000
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Background Blob */}
            <div className="absolute top-1/2 left-1/2 -z-10 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-sky-100/50 via-yellow-50/50 to-transparent blur-3xl filter dark:from-sky-500/10 dark:via-yellow-400/10" />
          </div>
        </div>
      </div>
    </section>
  )
}
