import { motion } from "framer-motion"
import { Eye, Heart } from "lucide-react"

export interface Product {
  id: string
  name: string
  price: number
  originalPrice?: number
  image: string
  category: string
  badge?: string
  isNew?: boolean
}

interface ProductCardProps {
  product: Product
  index: number
  onQuickView: (product: Product) => void
}

export default function ProductCard({
  product,
  index,
  onQuickView,
}: ProductCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        ease: [0.16, 1, 0.3, 1] as const,
      }}
      className="group relative"
    >
      <motion.div
        whileHover={{ y: -8 }}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as const }}
        className="shadow-soft hover:shadow-soft-lg overflow-hidden rounded-2xl bg-white transition-shadow duration-500 dark:border dark:border-gray-700 dark:bg-gray-800 dark:shadow-none"
      >
        {/* Image Container */}
        <div className="relative aspect-[4/5] overflow-hidden bg-[#f5f5f3] dark:bg-gray-900">
          <motion.img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
          />

          {/* Badges */}
          {(product.badge || product.isNew) && (
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {product.isNew && (
                <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-bold text-white">
                  NEW
                </span>
              )}
              {product.badge && (
                <span className="bg-af-brass rounded-full px-3 py-1 text-xs font-bold text-white">
                  {product.badge}
                </span>
              )}
            </div>
          )}

          {/* Hover Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center gap-3 bg-black/10"
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="shadow-soft-lg text-af-text hover:text-af-forest flex h-12 w-12 items-center justify-center rounded-full bg-white transition-colors dark:bg-gray-900 dark:text-gray-200 dark:shadow-none dark:hover:text-orange-400"
            >
              <Heart size={20} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onQuickView(product)}
              className="shadow-soft-lg text-af-text hover:text-af-forest flex h-12 w-12 items-center justify-center rounded-full bg-white transition-colors dark:bg-gray-900 dark:text-gray-200 dark:shadow-none dark:hover:text-orange-400"
            >
              <Eye size={20} />
            </motion.button>
          </motion.div>
        </div>

        {/* Content */}
        <div className="p-5">
          <span className="text-af-text-secondary font-mono text-xs tracking-wider uppercase dark:text-gray-400">
            {product.category}
          </span>
          <h3 className="font-display text-af-text mt-1 mb-2 line-clamp-1 text-lg font-semibold dark:text-white">
            {product.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-af-forest font-mono text-lg font-bold">
              ₱{product.price.toLocaleString()}
            </span>
            {product.originalPrice && (
              <span className="text-af-text-secondary font-mono text-sm line-through dark:text-gray-400">
                ₱{product.originalPrice.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
