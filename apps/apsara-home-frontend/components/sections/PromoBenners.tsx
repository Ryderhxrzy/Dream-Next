"use client"

import { motion } from "framer-motion"
import Image from "next/image"

const PromoBenners = () => {
  return (
    <section className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          whileHover={{ y: -4 }}
          className="group relative h-96 cursor-pointer overflow-hidden rounded-3xl"
        >
          <Image
            src="/Images/PromoBanners/ct2-img1-large.jpg"
            alt="Furniture"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-8">
            <p className="mb-2 text-xs font-semibold tracking-widest text-orange-400 uppercase">
              Limited Offer
            </p>
            <h3 className="mb-1 text-2xl leading-tight font-bold text-white">
              Build Your Home
              <br />
              with Furniture
            </h3>
            <p className="mb-5 text-sm text-white/60">Starting from ₱2,999</p>
            <button className="group/btn flex items-center gap-2 self-start rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-orange-600">
              Shop Now
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="transition-transform group-hover/btn:translate-x-1"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          whileHover={{ y: -4 }}
          className="group relative h-96 cursor-pointer overflow-hidden rounded-3xl"
        >
          <Image
            src="/Images/PromoBanners/ct2-img2-large.jpg"
            alt="Appliances"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-sky-900/90 via-sky-900/40 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-8">
            <p className="mb-2 text-xs font-semibold tracking-widest text-sky-300 uppercase">
              New Collection
            </p>
            <h3 className="mb-1 text-2xl leading-tight font-bold text-white">
              Choose Your
              <br />
              Best Appliance
            </h3>
            <p className="mb-5 text-sm text-white/60">
              Up to 40% off this week
            </p>
            <button className="group/btn flex items-center gap-2 self-start rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-sky-600">
              Explore
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="transition-transform group-hover/btn:translate-x-1"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default PromoBenners
