import { motion } from "framer-motion"
import { ArrowRight, CheckCircle2 } from "lucide-react"

export default function CTASection() {
  return (
    <section className="relative overflow-hidden bg-blue-950 py-24">
      {/* Background Visuals */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute top-0 right-0 h-[800px] w-[800px] translate-x-1/3 -translate-y-1/2 rounded-full bg-blue-500 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[600px] w-[600px] -translate-x-1/4 translate-y-1/3 rounded-full bg-orange-500 blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative mb-8 inline-block"
          >
            <h2 className="mb-6 text-4xl leading-tight font-bold text-white md:text-5xl lg:text-6xl">
              Start Building Your
              <br />
              <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                AF Home Income Today.
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-xl leading-relaxed text-gray-200">
              Join thousands of affiliates turning everyday home products into
              long-term value and income.
            </p>
          </motion.div>

          <motion.a
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-6"
            href="/login"
          >
            <button className="group relative transform rounded-full bg-white px-8 py-4 text-lg font-bold text-blue-950 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-gray-50 hover:shadow-2xl">
              <span className="flex items-center gap-2">
                Join the AF Home Affiliate Program
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
              <div className="absolute inset-0 rounded-full ring-4 ring-white/30 transition-all duration-500 group-hover:ring-white/50" />
            </button>

            <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-gray-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-orange-400" />
                <span>Free registration</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-orange-400" />
                <span>No inventory</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-orange-400" />
                <span>Full support</span>
              </div>
            </div>
          </motion.a>
        </div>
      </div>
    </section>
  )
}
