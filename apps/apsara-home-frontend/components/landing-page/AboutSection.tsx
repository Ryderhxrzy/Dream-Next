import { motion } from "framer-motion"

export default function AboutSection() {
  return (
    <section
      id="about"
      className="overflow-hidden bg-gradient-to-br from-white via-gray-50 to-white py-24 md:py-32 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
    >
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-7xl">
          {/* Hero Section */}
          <div className="mb-16 text-center">
            <span className="mb-4 block font-mono text-sm tracking-widest text-orange-500 uppercase">
              Our Story
            </span>
            <h2 className="font-display text-af-text mb-6 text-4xl leading-tight font-bold md:text-5xl lg:text-6xl dark:text-white">
              Crafting Spaces,{" "}
              <span className="text-orange-500 italic">Creating Memories</span>
            </h2>
            <p className="text-af-text-secondary mx-auto max-w-3xl text-lg leading-relaxed dark:text-gray-300">
              AFhome was born from a simple belief: everyone deserves a home
              that reflects their personality and inspires their daily life.
              Founded in 2009, we've grown from a small showroom into a
              destination for thoughtfully designed furniture.
            </p>
          </div>

          <div className="mb-16 grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }}
            >
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-display text-af-text mb-4 text-3xl font-bold md:text-4xl dark:text-white">
                    Our Philosophy
                  </h3>
                  <p className="text-af-text-secondary leading-relaxed dark:text-gray-400">
                    We partner with skilled artisans and sustainable
                    manufacturers worldwide to bring you pieces that combine
                    timeless aesthetics with exceptional comfort. Every item in
                    our collection is curated with intention—designed to last
                    and meant to be loved.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-display text-af-text mb-4 text-3xl font-bold md:text-4xl dark:text-white">
                    Our Promise
                  </h3>
                  <p className="text-af-text-secondary leading-relaxed dark:text-gray-400">
                    From the first sketch to the final delivery, we're committed
                    to creating an experience that makes turning your house into
                    a home both effortless and enjoyable. Quality craftsmanship,
                    sustainable materials, and exceptional service are at the
                    heart of everything we do.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Right Image */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.8,
                delay: 0.2,
                ease: [0.16, 1, 0.3, 1] as const,
              }}
              className="relative overflow-hidden rounded-2xl shadow-2xl shadow-gray-500/10 dark:shadow-gray-700/20"
            >
              <img
                src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=80"
                alt="Living space showcase"
                className="h-96 w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-8 left-8 text-white">
                <span className="font-display mb-2 block text-2xl font-bold">
                  15+ Years
                </span>
                <span className="text-lg font-semibold">of Excellence</span>
              </div>
            </motion.div>
          </div>

          {/* Values Grid */}
          <div className="mb-16 grid gap-8 md:grid-cols-3">
            {[
              {
                icon: "🎨",
                title: "Design",
                desc: "Timeless Aesthetics",
                color: "text-orange-400",
              },
              {
                icon: "⭐",
                title: "Quality",
                desc: "Premium Materials",
                color: "text-blue-400",
              },
              {
                icon: "👢",
                title: "Service",
                desc: "White Glove Care",
                color: "text-green-400",
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
                className="rounded-2xl bg-white p-6 text-center shadow-lg transition-all duration-300 hover:shadow-xl dark:bg-gray-800"
              >
                <div className="mb-4 text-4xl">{item.icon}</div>
                <h4
                  className={`font-display mb-2 text-xl font-bold ${item.color}`}
                >
                  {item.title}
                </h4>
                <p className="text-af-text-secondary text-sm dark:text-gray-400">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <h3 className="font-display text-af-text mb-4 text-3xl font-bold md:text-4xl dark:text-white">
              Ready to Transform Your Space?
            </h3>
            <p className="text-af-text-secondary mx-auto mb-8 max-w-2xl leading-relaxed dark:text-gray-400">
              Visit our showroom or explore our collection online to find the
              perfect pieces for your home.
            </p>
            <button className="rounded-full bg-orange-500 px-8 py-3 font-semibold text-white transition-all duration-300 hover:bg-orange-600">
              Explore Collection
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
