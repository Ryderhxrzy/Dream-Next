import { motion } from "framer-motion"
import { Check, Heart, Home, Smartphone, TrendingUp, User } from "lucide-react"

export default function TargetAudienceSection() {
  const criteria = [
    {
      icon: Home,
      text: "You want to earn without stocking products",
      color: "text-blue-600 bg-blue-100",
    },
    {
      icon: Smartphone,
      text: "You create content on social media",
      color: "text-pink-600 bg-pink-100",
    },
    {
      icon: User,
      text: "You help people find home solutions",
      color: "text-orange-600 bg-orange-100",
    },
    {
      icon: TrendingUp,
      text: "You want extra income or a scalable business",
      color: "text-green-600 bg-green-100",
    },
    {
      icon: Heart,
      text: "You believe homes should be better, not more expensive",
      color: "text-red-600 bg-red-100",
    },
  ]

  const personas = [
    {
      image: "/Images/landing/content-creator.png",
      label: "Content Creator",
      position: "h-64 sm:h-auto",
    },
    {
      image: "/Images/landing/young-couple.png",
      label: "Young Couple",
      position: "h-64 sm:h-auto",
    },
    {
      image: "/Images/landing/sales-agent.png",
      label: "Sales Agent / Designer",
      position: "h-64 sm:h-auto",
    },
    {
      image: "/Images/landing/digital-nomad.png",
      label: "OFW / Digital Nomad",
      position: "h-64 sm:h-auto",
    },
  ]

  return (
    <section className="relative overflow-hidden bg-gray-50 py-24 dark:bg-gray-900">
      <div className="relative z-10 container mx-auto px-4">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Visual Content - Persona Grid */}
          <div className="order-2 lg:order-1">
            <div className="grid h-[600px] grid-cols-2 gap-4">
              {personas.map((persona, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                  className={`group relative overflow-hidden rounded-2xl ${persona.position}`}
                >
                  <img
                    src={persona.image}
                    alt={persona.label}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <span className="text-lg font-bold text-white">
                      {persona.label}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Text Content */}
          <div className="order-1 lg:order-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-6 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-1.5 text-sm font-semibold text-indigo-700"
            >
              <Check size={14} />
              WHO THIS IS FOR
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mb-8 text-4xl leading-tight font-bold text-gray-900 md:text-5xl dark:text-white"
            >
              This Is for You If...
            </motion.h2>

            <div className="space-y-6">
              {criteria.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="group flex items-center gap-4"
                >
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors ${item.color} duration-300 group-hover:scale-110`}
                  >
                    <item.icon size={20} />
                  </div>
                  <span className="text-lg font-medium text-gray-700 transition-colors group-hover:text-gray-900 dark:text-gray-200 dark:group-hover:text-white">
                    {item.text}
                  </span>
                </motion.div>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8 }}
              className="mt-10 rounded-2xl border border-gray-100 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800"
            >
              <p className="text-gray-600 italic dark:text-gray-300">
                &quot;Whether you&apos;re looking for a side hustle or a
                full-time career, AF Home gives you the platform to succeed on
                your own terms.&quot;
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
