"use client"

import { motion } from "framer-motion"
import Image from "next/image"

import ProductCard from "../ui/ProductCard"

const products = [
  {
    name: "Bently Chest Drawer",
    price: 2600,
    originalPrice: 2020,
    image: "/Images/FeaturedSection/bently_chest_drawer.png",
    badge: "SALE",
  },
  {
    name: "ZOOEY Cutlery",
    price: 119,
    originalPrice: 9500,
    image: "/Images/FeaturedSection/zooey_cutlery.png",
    badge: "25% OFF",
  },
  {
    name: "GAYNOUR L-Shape Fabric Sofa",
    price: 13700,
    image: "/Images/FeaturedSection/gaynour_l-shape.jpg",
    badge: "NEW",
  },
  {
    name: "SARAH Corner L-Shape Fabric Sofa",
    price: 8547,
    originalPrice: 11000,
    image: "/Images/FeaturedSection/sarah_corner_l-shaped.png",
    badge: "SALE",
  },
]

const FeaturedSections = () => {
  return (
    <section className="bg-gray-50 py-16 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-3xl"
          >
            <Image
              src="/Images/FeaturedSection/home_living.jpg"
              alt="Home Living"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="rigt-8 absolute bottom-8 left-8">
              <p className="mb-2 text-xs font-semibold tracking-widest text-orange-400 uppercase">
                Featured
              </p>
              <h2 className="mb-3 text-3xl leading-tight font-bold text-white">
                Minimal &<br />
                Simple Design
              </h2>
              <p className="mb-5 text-sm text-white/60">
                Crafted for the moderm home.
              </p>
              <button className="group/btn flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-orange-600 active:scale-95">
                Shop Collection
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
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

          {/* Right Product Grid  */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <p className="mb-2 text-sm font-semibold tracking-wider text-orange-500 uppercase">
              Sale Items
            </p>
            <h2 className="mb-6 text-2xl font-bold text-slate-900 dark:text-gray-100">
              Top Picks This Week
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {products.map((product, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ProductCard {...product} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default FeaturedSections
