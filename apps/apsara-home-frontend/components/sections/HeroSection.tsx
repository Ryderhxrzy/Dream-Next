"use client"

import { motion } from "framer-motion"

import CategoryCard from "../category/CategoryCard"

const categories = [
  {
    name: "Chairs & Stools",
    count: 14,
    image: "/Images/HeroSection/chairs_stools.jpg",
  },
  {
    name: "Dining Table",
    count: 6,
    image: "/Images/HeroSection/Dinning_table.jpg",
  },
  { name: "Sofas", count: 56, image: "/Images/HeroSection/sofas.jpg" },
  { name: "TV Rack", count: 24, image: "/Images/HeroSection/tv_racks.jpg" },
]

const HeroSection = () => {
  return (
    <section className="container mx-auto !bg-white px-4 py-10 dark:!bg-gray-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8 text-center"
      >
        <p className="mb-2 text-sm font-semibold tracking-widest text-orange-500 uppercase">
          Shop by Category
        </p>
        <h2 className="text-3xl font-bold text-slate-900 md:text-4xl dark:text-gray-100">
          Find Your Perfect <span>Furniture</span>
        </h2>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {categories.map((category, index) => (
          <CategoryCard key={index} {...category} index={index} />
        ))}
      </div>
    </section>
  )
}

export default HeroSection
