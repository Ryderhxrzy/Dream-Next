import { motion } from "framer-motion"

interface Category {
  id: string
  name: string
  image: string
  count: number
}

const categories: Category[] = [
  {
    id: "living",
    name: "Living Room",
    image:
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80",
    count: 45,
  },
  {
    id: "bedroom",
    name: "Bedroom",
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&q=80",
    count: 32,
  },
  {
    id: "dining",
    name: "Dining",
    image:
      "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400&q=80",
    count: 28,
  },
  {
    id: "office",
    name: "Home Office",
    image:
      "https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=400&q=80",
    count: 24,
  },
  {
    id: "outdoor",
    name: "Outdoor",
    image:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400&q=80",
    count: 18,
  },
]

interface CategoryNavProps {
  selectedCategory: string | null
  onSelectCategory: (id: string | null) => void
}

export default function CategoryNav({
  selectedCategory,
  onSelectCategory,
}: CategoryNavProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  }

  return (
    <section className="bg-af-cream py-16 md:py-24 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <h2 className="font-display text-af-text mb-4 text-3xl font-semibold md:text-4xl lg:text-5xl dark:text-white">
            Shop by Category
          </h2>
          <p className="text-af-text-secondary mx-auto max-w-xl text-lg dark:text-gray-400">
            Find the perfect pieces for every room in your home
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="flex flex-wrap justify-center gap-4 md:gap-6"
        >
          {/* All Products Pill */}
          <motion.button
            variants={itemVariants}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectCategory(null)}
            className={`relative rounded-full px-6 py-3 text-sm font-semibold transition-all duration-300 md:text-base ${
              selectedCategory === null
                ? "shadow-soft-lg bg-orange-500 text-white"
                : "text-af-text shadow-soft hover:shadow-soft-lg bg-white dark:border dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:shadow-none"
            }`}
            style={{
              boxShadow:
                selectedCategory === null
                  ? "0px 4px 12px rgba(44, 95, 79, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)"
                  : "inset 0 2px 4px rgba(0,0,0,0.03), 0px 2px 8px rgba(0,0,0,0.04), 0px 8px 24px rgba(0,0,0,0.06)",
            }}
          >
            All Products
            <span className="ml-2 font-mono text-xs opacity-70">147</span>
          </motion.button>

          {/* Category Pills */}
          {categories.map((category) => (
            <motion.button
              key={category.id}
              variants={itemVariants}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectCategory(category.id)}
              className={`relative flex items-center gap-3 overflow-hidden rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 md:text-base ${
                selectedCategory === category.id
                  ? "shadow-soft-lg bg-orange-500 text-white"
                  : "text-af-text shadow-soft hover:shadow-soft-lg bg-white dark:border dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:shadow-none"
              }`}
              style={{
                boxShadow:
                  selectedCategory === category.id
                    ? "0px 4px 12px rgba(44, 95, 79, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)"
                    : "inset 0 2px 4px rgba(0,0,0,0.03), 0px 2px 8px rgba(0,0,0,0.04), 0px 8px 24px rgba(0,0,0,0.06)",
              }}
            >
              <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full">
                <img
                  src={category.image}
                  alt={category.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <span>{category.name}</span>
              <span className="font-mono text-xs opacity-70">
                {category.count}
              </span>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
