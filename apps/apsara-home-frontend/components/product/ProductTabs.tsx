"use client"

import { CategoryProduct } from "@/libs/CategoryData"
import { displayColorName } from "@/libs/colorUtils"
import type {
  ProductReview,
  ProductReviewSummary,
} from "@/store/api/productsApi"
import { motion } from "framer-motion"
import DOMPurify from "isomorphic-dompurify"

import StarRating from "../ui/StarRating"

interface ProductTabsProps {
  product: CategoryProduct
  reviews?: ProductReview[]
  reviewSummary?: ProductReviewSummary | null
}

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#039;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")

const normalizeMojibake = (value: string) =>
  value
    .replace(/â€œ|â€|â€/g, '"')
    .replace(/â€˜|â€™/g, "'")
    .replace(/â€¢/g, "•")
    .replace(/â€“/g, "-")
    .replace(/â€”/g, "—")
    .replace(/â€¦/g, "…")
    .replace(/Ã—/g, "×")
    .replace(/Â°/g, "°")
    .replace(/Â±/g, "±")
    .replace(/Â·/g, "·")
    .replace(/Â/g, "")

const cleanProductDescription = (value: string) => {
  let decoded = value.trim()

  // Some rows arrive double-encoded from the database, so decode a few times.
  for (let i = 0; i < 3; i += 1) {
    const next = decodeHtmlEntities(decoded)
    if (next === decoded) break
    decoded = next
  }

  return normalizeMojibake(decoded)
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*\/p\s*>/gi, "\n\n")
    .replace(/<\s*\/div\s*>/gi, "\n")
    .replace(/<\s*\/li\s*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "- ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

const sanitizeProductDescriptionHtml = (value: string) => {
  let decoded = value.trim()

  for (let i = 0; i < 3; i += 1) {
    const next = decodeHtmlEntities(decoded)
    if (next === decoded) break
    decoded = next
  }

  return DOMPurify.sanitize(normalizeMojibake(decoded))
}

const ProductTabs = ({
  product,
  reviews = [],
  reviewSummary,
}: ProductTabsProps) => {
  const cleanedDescription = product.description
    ? cleanProductDescription(product.description)
    : ""
  const sanitizedDescriptionHtml = product.description
    ? sanitizeProductDescriptionHtml(product.description)
    : ""

  const reviewCount = reviewSummary?.count ?? reviews.length ?? 0
  const avgRatingValue =
    typeof reviewSummary?.average === "number"
      ? reviewSummary.average
      : reviewCount > 0
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviewCount
        : 0
  const avgRating = avgRatingValue.toFixed(1)
  const breakdown = reviewSummary?.breakdown ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  const formattedDate = (value?: string | null) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date)
  }
  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .slice(0, 2)
      .join("") || "CU"

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="space-y-4"
    >
      {/* Description Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">
          Description
        </h3>
        {sanitizedDescriptionHtml ? (
          <div
            className="prose prose-sm dark:prose-invert prose-headings:scroll-mt-24 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 max-w-none text-gray-600 dark:text-gray-300"
            dangerouslySetInnerHTML={{ __html: sanitizedDescriptionHtml }}
          />
        ) : cleanedDescription ? (
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            {cleanedDescription.split(/\n{2,}/).map((paragraph, index) => (
              <p
                key={`${index}-${paragraph.slice(0, 24)}`}
                className="whitespace-pre-line"
              >
                {paragraph.trim()}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 italic dark:text-gray-500">
            No description available.
          </p>
        )}
      </div>

      {/* Specifications Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">
          Specifications
        </h3>
        {(() => {
          const dimParts: string[] = []
          if (product.pswidth && product.pswidth > 0)
            dimParts.push(`W: ${product.pswidth} cm`)
          if (product.pslenght && product.pslenght > 0)
            dimParts.push(`D: ${product.pslenght} cm`)
          if (product.psheight && product.psheight > 0)
            dimParts.push(`H: ${product.psheight} cm`)
          const dimensions = dimParts.length > 0 ? dimParts.join(" x ") : null

          const colorSet = new Set<string>()
          product.variants?.forEach((v) => {
            if (v.color) colorSet.add(displayColorName(v.color, v.colorHex))
          })
          const colorOptions =
            colorSet.size > 0 ? [...colorSet].join(", ") : null

          const rows = [
            product.material
              ? { label: "Material", value: product.material }
              : null,
            dimensions ? { label: "Dimensions", value: dimensions } : null,
            product.weight && product.weight > 0
              ? { label: "Weight Capacity", value: `${product.weight} kg` }
              : null,
            product.assemblyRequired
              ? { label: "Assembly Required", value: "Yes" }
              : null,
            product.warranty
              ? { label: "Warranty", value: product.warranty }
              : null,
            colorOptions
              ? { label: "Color Options", value: colorOptions }
              : null,
          ].filter(Boolean) as { label: string; value: string }[]

          return rows.length > 0 ? (
            <div className="space-y-2">
              {rows.map((spec) => (
                <div
                  key={spec.label}
                  className="flex items-center justify-between rounded border-b border-gray-100 bg-gray-50 px-4 py-2 text-sm last:border-b-0 dark:border-gray-700 dark:bg-gray-700/50"
                >
                  <span className="w-36 shrink-0 font-semibold text-slate-700 dark:text-gray-200">
                    {spec.label}
                  </span>
                  <span className="text-right text-gray-500 dark:text-gray-300">
                    {spec.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic dark:text-gray-500">
              No specifications available.
            </p>
          )
        })()}
      </div>

      {/* Reviews Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">
          Reviews ({reviewCount})
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-4 rounded-xl bg-sky-50 p-4 dark:bg-sky-900/20">
            <div className="shrink-0 text-center">
              <div className="text-3xl font-bold text-sky-500 dark:text-sky-400">
                {avgRating}
              </div>
              <StarRating rating={Math.round(Number(avgRating))} size={12} />
              <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {reviewCount} reviews
              </div>
            </div>
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = breakdown[star] ?? 0
                const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-gray-500 dark:text-gray-400">
                      {star}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="8"
                      height="8"
                      viewBox="0 0 24 24"
                      fill="#38bdf8"
                      className="shrink-0"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: star * 0.05 }}
                        className="h-full rounded-full bg-sky-400 dark:bg-sky-500"
                      />
                    </div>
                    <span className="w-4 text-right text-gray-400 dark:text-gray-500">
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {reviews.length > 0 ? (
            reviews.map((review) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-xl border border-gray-100 p-4 transition-all hover:border-sky-100 dark:border-gray-700 dark:hover:border-sky-900/50"
              >
                <div className="mb-2 flex items-start gap-3">
                  {review.customer_avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={review.customer_avatar}
                      alt={review.customer_name}
                      className="h-8 w-8 shrink-0 rounded-full border border-sky-100 object-cover dark:border-sky-900/50"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
                      {getInitials(review.customer_name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800 dark:text-gray-200">
                        {review.customer_name}
                      </span>
                      {review.created_at && (
                        <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                          {formattedDate(review.created_at)}
                        </span>
                      )}
                    </div>
                    <StarRating rating={review.rating} size={12} />
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {review.review}
                </p>
              </motion.div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
              No reviews yet. Be the first to share your experience.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default ProductTabs
