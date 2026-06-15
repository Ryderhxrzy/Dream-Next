import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ShoppingBag,
  X,
} from "lucide-react"

import { Product } from "./ProductCard"

interface QuickViewModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onAddToCart: (product: Product, quantity: number) => void
}

export default function QuickViewModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
}: QuickViewModalProps) {
  const [currentImage, setCurrentImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isAdded, setIsAdded] = useState(false)

  // Mock multiple images
  const images = product
    ? [
        product.image,
        product.image.replace("w=600", "w=601"),
        product.image.replace("w=600", "w=602"),
      ]
    : []

  const handleAddToCart = () => {
    if (!product) return
    setIsAdded(true)
    onAddToCart(product, quantity)
    setTimeout(() => {
      setIsAdded(false)
    }, 2000)
  }

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <AnimatePresence>
      {isOpen && product && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
            className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[95%] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-hidden"
          >
            <div
              className="shadow-soft-lg overflow-hidden rounded-3xl bg-white/95 backdrop-blur-xl dark:bg-gray-900/95"
              style={{
                border: "1px solid rgba(255, 255, 255, 0.3)",
              }}
            >
              {/* Close Button */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="shadow-soft text-af-text hover:text-af-forest absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white transition-colors dark:bg-gray-800 dark:text-gray-100 dark:shadow-none dark:hover:text-orange-400"
              >
                <X size={20} />
              </motion.button>

              <div className="grid gap-0 md:grid-cols-2">
                {/* Image Gallery */}
                <div className="relative aspect-square bg-[#f5f5f3] md:aspect-auto dark:bg-gray-950">
                  <motion.img
                    key={currentImage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    src={images[currentImage]}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />

                  {/* Navigation Arrows */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={prevImage}
                    className="shadow-soft text-af-text absolute top-1/2 left-4 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-all hover:bg-white dark:bg-gray-800/80 dark:text-gray-100 dark:shadow-none dark:hover:bg-gray-700"
                  >
                    <ChevronLeft size={20} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={nextImage}
                    className="shadow-soft text-af-text absolute top-1/2 right-4 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-all hover:bg-white dark:bg-gray-800/80 dark:text-gray-100 dark:shadow-none dark:hover:bg-gray-700"
                  >
                    <ChevronRight size={20} />
                  </motion.button>

                  {/* Image Indicators */}
                  <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImage(index)}
                        className={`h-2.5 w-2.5 rounded-full transition-all ${
                          currentImage === index
                            ? "bg-af-forest w-6"
                            : "bg-white/60 dark:bg-gray-500/70"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Badges */}
                  {(product.badge || product.isNew) && (
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      {product.isNew && (
                        <span className="bg-af-forest rounded-full px-3 py-1 text-xs font-bold text-white">
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
                </div>

                {/* Product Details */}
                <div className="flex flex-col justify-center p-8 md:p-10">
                  <span className="text-af-text-secondary font-mono text-xs tracking-wider uppercase dark:text-gray-400">
                    {product.category}
                  </span>
                  <h2 className="font-display text-af-text mt-2 mb-4 text-2xl font-semibold md:text-3xl dark:text-white">
                    {product.name}
                  </h2>

                  <div className="mb-6 flex items-center gap-3">
                    <span className="text-af-forest font-mono text-2xl font-bold">
                      ${product.price.toLocaleString()}
                    </span>
                    {product.originalPrice && (
                      <span className="text-af-text-secondary font-mono text-lg line-through dark:text-gray-400">
                        ${product.originalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <p className="text-af-text-secondary mb-8 leading-relaxed dark:text-gray-400">
                    Crafted with premium materials and meticulous attention to
                    detail, this piece brings both comfort and sophistication to
                    your space. Designed to complement any modern interior while
                    standing the test of time.
                  </p>

                  {/* Quantity Selector */}
                  <div className="mb-6 flex items-center gap-4">
                    <span className="text-af-text font-medium dark:text-white">
                      Quantity:
                    </span>
                    <div className="flex items-center gap-3 rounded-full bg-[#f5f5f3] px-2 py-1 dark:bg-gray-800">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white dark:hover:bg-gray-700"
                      >
                        <Minus size={16} />
                      </motion.button>
                      <span className="w-8 text-center font-mono text-lg dark:text-white">
                        {quantity}
                      </span>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setQuantity(quantity + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white dark:hover:bg-gray-700"
                      >
                        <Plus size={16} />
                      </motion.button>
                    </div>
                  </div>

                  {/* Add to Cart Button */}
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAddToCart}
                    disabled={isAdded}
                    className={`relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full py-4 text-base font-semibold transition-all duration-500 ${
                      isAdded
                        ? "bg-green-500 text-white"
                        : "bg-af-brass text-white hover:bg-[#c4955f]"
                    }`}
                    style={{
                      boxShadow: "0px 4px 16px rgba(212, 165, 116, 0.4)",
                    }}
                  >
                    <AnimatePresence mode="wait">
                      {isAdded ? (
                        <motion.span
                          key="added"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="flex items-center gap-2"
                        >
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: [0, 1.2, 1] }}
                            transition={{ duration: 0.4 }}
                          >
                            <Check size={20} />
                          </motion.span>
                          Added to Cart!
                        </motion.span>
                      ) : (
                        <motion.span
                          key="add"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2"
                        >
                          <ShoppingBag size={20} />
                          Add to Cart — $
                          {(product.price * quantity).toLocaleString()}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  {/* Trust Indicators */}
                  <div className="text-af-text-secondary mt-6 flex flex-wrap gap-4 text-sm dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Check size={14} className="text-af-forest" /> Free
                      Shipping
                    </span>
                    <span className="flex items-center gap-1">
                      <Check size={14} className="text-af-forest" /> 30-Day
                      Returns
                    </span>
                    <span className="flex items-center gap-1">
                      <Check size={14} className="text-af-forest" /> 2-Year
                      Warranty
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
