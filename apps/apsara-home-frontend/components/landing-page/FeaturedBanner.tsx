import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { ArrowRight } from "lucide-react"

export default function FeaturedBanner() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "20%"])

  return (
    <section
      ref={ref}
      id="collections"
      className="relative overflow-hidden py-24 md:py-32"
    >
      {/* Background */}
      <motion.div style={{ y }} className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1920&q=85"
          alt="Featured collection"
          className="h-[130%] w-full object-cover"
        />
        <div className="absolute inset-0 bg-blue-500/20" />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4">
        <div className="grid items-center gap-12 md:grid-cols-2">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }}
          >
            <span className="mb-4 block font-mono text-sm tracking-widest text-orange-600 uppercase">
              Exclusive Collection
            </span>
            <h2 className="font-display mb-6 text-4xl leading-tight font-light text-white md:text-5xl lg:text-6xl">
              The{" "}
              <span className="font-semibold text-orange-500 italic">
                Artisan
              </span>{" "}
              Series
            </h2>
            <p className="mb-8 max-w-lg text-lg leading-relaxed text-white/80">
              Discover our limited edition collection featuring handcrafted
              pieces from master artisans. Each item tells a story of
              exceptional craftsmanship and timeless design.
            </p>
            <div className="flex flex-wrap gap-4">
              <motion.a
                href="#shop"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="shadow-soft-lg group inline-flex items-center gap-2 rounded-full bg-orange-500 px-8 py-4 text-base font-semibold text-white transition-all duration-300 hover:bg-[#c4955f]"
              >
                Shop Collection
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </motion.a>
              <motion.a
                href="#about"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-8 py-4 text-base font-semibold text-white transition-all duration-300 hover:bg-white/10"
              >
                Learn More
              </motion.a>
            </div>
          </motion.div>

          {/* Featured Products Preview */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.8,
              delay: 0.2,
              ease: [0.16, 1, 0.3, 1] as const,
            }}
            className="grid grid-cols-2 gap-4"
          >
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{
                duration: 0.4,
                ease: [0.34, 1.56, 0.64, 1] as const,
              }}
              className="shadow-soft-lg overflow-hidden rounded-2xl bg-white"
            >
              <img
                src="https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&q=80"
                alt="Artisan chair"
                className="aspect-square w-full object-cover"
              />
              <div className="p-4">
                <h4 className="font-display text-af-text font-semibold">
                  Artisan Chair
                </h4>
                <span className="text-af-forest font-mono text-sm">$1,299</span>
              </div>
            </motion.div>
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{
                duration: 0.4,
                ease: [0.34, 1.56, 0.64, 1] as const,
              }}
              className="shadow-soft-lg mt-8 overflow-hidden rounded-2xl bg-white"
            >
              <img
                src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80"
                alt="Designer sofa"
                className="aspect-square w-full object-cover"
              />
              <div className="p-4">
                <h4 className="font-display text-af-text font-semibold">
                  Designer Sofa
                </h4>
                <span className="text-af-forest font-mono text-sm">$3,499</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
