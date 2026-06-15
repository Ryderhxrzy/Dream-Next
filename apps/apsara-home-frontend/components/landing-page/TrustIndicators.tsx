import { motion } from "framer-motion"
import { Award, RotateCcw, Shield, Truck } from "lucide-react"

const indicators = [
  {
    icon: Truck,
    title: "Free Membership Shipping",
    description: "On orders over 50,000",
  },
  {
    icon: Shield,
    title: "1-Year Warranty",
    description: "Guaranteed protection",
  },
  {
    icon: RotateCcw,
    title: "30-Day Returns",
    description: "Hassle-free returns",
  },
  {
    icon: Award,
    title: "Premium Quality",
    description: "Handpicked materials",
  },
]

export default function TrustIndicators() {
  return (
    <section className="bg-white py-16 md:py-24 dark:bg-gray-950">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8"
        >
          {indicators.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: index * 0.1,
                ease: [0.16, 1, 0.3, 1] as const,
              }}
              whileHover={{ y: -4 }}
              className="bg-af-cream/50 rounded-2xl p-6 text-center dark:border dark:border-gray-700 dark:bg-gray-800/70"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: index * 0.5,
                  ease: "easeInOut",
                }}
                className="bg-af-forest/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl dark:bg-orange-500/10"
              >
                <item.icon size={28} className="text-orange-500" />
              </motion.div>
              <h3 className="font-display text-af-text mb-1 text-lg font-semibold dark:text-white">
                {item.title}
              </h3>
              <p className="text-af-text-secondary text-sm dark:text-gray-400">
                {item.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
