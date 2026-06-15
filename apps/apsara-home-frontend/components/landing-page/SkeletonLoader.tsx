import { motion } from "framer-motion"

interface SkeletonLoaderProps {
  count?: number
}

export default function SkeletonLoader({ count = 8 }: SkeletonLoaderProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.05 }}
          className="shadow-soft overflow-hidden rounded-2xl bg-white dark:border dark:border-gray-700 dark:bg-gray-800 dark:shadow-none"
        >
          {/* Image Skeleton */}
          <div className="animate-shimmer aspect-[4/5] bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />

          {/* Content Skeleton */}
          <div className="space-y-3 p-5">
            {/* Category */}
            <div className="animate-shimmer h-3 w-20 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />

            {/* Title */}
            <div className="animate-shimmer h-5 w-3/4 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />

            {/* Price */}
            <div className="animate-shimmer h-5 w-24 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />
          </div>
        </motion.div>
      ))}
    </div>
  )
}
