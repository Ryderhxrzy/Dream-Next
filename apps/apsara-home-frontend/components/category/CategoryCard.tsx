"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"

interface CategoryCardProps {
  name: string
  count: number
  image: string
  index?: number
}

// Convert category name to URL slug
// "Chairs & Stools" → "chairs-stools"
const toSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

const CategoryCard = ({ name, count, image, index = 0 }: CategoryCardProps) => {
  return (
    <Link href={`/category/${toSlug(name)}`}>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
        whileHover={{ y: -4 }}
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:border-indigo-200 hover:bg-slate-50"
      >
        {/* Top media */}
        <div className="relative h-40 md:h-52 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/40 dark:to-slate-900">
          <Image
            src={image}
            alt={name}
            fill
            className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </div>

        {/* Content */}
        <div className="p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm md:text-base font-semibold text-slate-900 dark:text-slate-100">
                {name}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {count} Products
              </p>
            </div>

            <div className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-indigo-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-indigo-300">
              Assigned
            </div>
          </div>

          <div className="mt-3 h-px w-full bg-slate-100 dark:bg-slate-800" />

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              View category
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition-colors group-hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300">
              Shop Now
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

export default CategoryCard
