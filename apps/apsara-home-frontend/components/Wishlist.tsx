"use client"

import { useEffect, useMemo, useState } from "react"
import {
  useGetWishlistQuery,
  useRemoveWishlistMutation,
} from "@/store/api/wishlistApi"
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query"
import { AnimatePresence, motion } from "framer-motion"
import { useSession } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import Footer from "@/components/landing-page/Footer"
import Navbar from "@/components/layout/Navbar"
import TopBar from "@/components/layout/TopBar"

type WishlistProps = {
  initialCategories?: any[]
  partnerBranding?: {
    slug: string
    displayName: string
    logoUrl?: string | null
    tabLogoUrl?: string | null
    notificationEmail?: string
  }
}

const HeartIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className="h-7 w-7"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
)

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
)

const CartIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
)

export default function Wishlist({
  initialCategories,
  partnerBranding,
}: WishlistProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, status, update: updateSession } = useSession()
  const isAuthenticated = Boolean(session?.user)
  const [pendingRemoveId, setPendingRemoveId] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [hasRefreshedSession, setHasRefreshedSession] = useState(false)

  // Refresh session once on component mount to handle login redirects
  useEffect(() => {
    if (!hasRefreshedSession && updateSession && !isAuthenticated) {
      updateSession()
      setHasRefreshedSession(true)
    }
  }, [])

  const {
    data: items = [],
    isFetching,
    isError,
    error,
    refetch,
  } = useGetWishlistQuery(undefined, {
    skip: !isAuthenticated,
  })

  const [removeWishlist] = useRemoveWishlistMutation()

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return items
    return items.filter((item) => item.name.toLowerCase().includes(keyword))
  }, [items, search])

  const errorMessage = useMemo(() => {
    if (!error) return "Failed to load wishlist from your account."
    const err = error as FetchBaseQueryError
    const statusCode =
      typeof err.status === "number"
        ? err.status
        : String(err.status ?? "unknown")
    const data = (err.data ?? {}) as { message?: string; error?: string }
    return data.message || data.error || `Request failed (HTTP ${statusCode}).`
  }, [error])

  const handleRemove = async (productId: number) => {
    setPendingRemoveId(productId)
    try {
      await removeWishlist(productId).unwrap()
    } finally {
      setPendingRemoveId(null)
    }
  }

  const isLoading = status === "loading" || isFetching

  const isPartnerStorefrontRoute = Boolean(partnerBranding?.slug)
  const partnerProductHref = isPartnerStorefrontRoute
    ? `/shop/${partnerBranding?.slug}/product`
    : "/shop"
  const partnerLogoSrc =
    partnerBranding?.logoUrl ||
    partnerBranding?.tabLogoUrl ||
    "/Images/af_home_logo.png"
  const partnerName = partnerBranding?.displayName || "Partner Store"

  return (
    <>
      {!isPartnerStorefrontRoute && <TopBar />}
      <Navbar
        initialCategories={initialCategories}
        logoSrc={isPartnerStorefrontRoute ? partnerLogoSrc : undefined}
        logoAlt={isPartnerStorefrontRoute ? partnerName : undefined}
        logoHref={isPartnerStorefrontRoute ? partnerProductHref : undefined}
        categoryOnlyNav={isPartnerStorefrontRoute}
        stickToTop={isPartnerStorefrontRoute}
        showGuestCartWishlist={isPartnerStorefrontRoute}
      />
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-10"
          >
            {/* Breadcrumb */}
            <div className="mb-5 flex items-center gap-1.5 text-xs text-slate-400 dark:text-gray-500">
              <button
                type="button"
                onClick={() =>
                  window.history.length > 1
                    ? router.back()
                    : router.push("/shop")
                }
                className="transition-colors hover:text-sky-500 dark:hover:text-sky-400"
              >
                Shop
              </button>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
              <span className="font-medium text-slate-600 dark:text-gray-400">
                Wishlist
              </span>
            </div>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              {/* Title */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500 text-white dark:bg-sky-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="white"
                    stroke="white"
                    strokeWidth="1.5"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    My Wishlist
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-gray-400">
                    Your saved favorites in one place
                  </p>
                </div>
              </div>

              {/* Stats */}
              {isAuthenticated && !isFetching && !isError && (
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-slate-100 bg-white px-5 py-3 dark:border-slate-700 dark:bg-gray-800">
                    <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase dark:text-gray-500">
                      Saved Items
                    </p>
                    <p className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white">
                      {items.length}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Search */}
            {isAuthenticated && !isError && items.length > 0 && (
              <div className="relative mt-6 max-w-sm">
                <svg
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-gray-500"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search saved items..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pr-10 pl-10 text-sm text-slate-800 transition-all outline-none placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-sky-700 dark:focus:ring-sky-900/50"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-400"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </motion.div>

          {/* Loading skeleton */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse overflow-hidden rounded-2xl border border-slate-100 bg-white dark:border-slate-700 dark:bg-gray-800"
                >
                  <div className="aspect-square bg-slate-100 dark:bg-gray-700" />
                  <div className="space-y-2.5 p-4">
                    <div className="h-3 w-3/4 rounded-lg bg-slate-100 dark:bg-gray-700" />
                    <div className="h-3 w-1/2 rounded-lg bg-slate-100 dark:bg-gray-700" />
                    <div className="mt-3 h-4 w-1/3 rounded-lg bg-slate-100 dark:bg-gray-700" />
                    <div className="mt-3 h-8 rounded-xl bg-slate-100 dark:bg-gray-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : !isAuthenticated ? (
            /* Not logged in */
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white py-24 text-center dark:border-slate-700 dark:bg-gray-800"
            >
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-sky-400 dark:bg-sky-900/30 dark:text-sky-500">
                <HeartIcon />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Sign in to view your wishlist
              </h2>
              <p className="mt-1.5 max-w-xs text-sm text-slate-500 dark:text-gray-400">
                Save products you love and access them anytime from any device.
              </p>
              <Link
                href={`/login?callback=${encodeURIComponent(pathname)}`}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700"
              >
                Sign In
              </Link>
            </motion.div>
          ) : isError ? (
            /* Error state */
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center rounded-3xl border border-red-200 bg-red-50 py-20 text-center dark:border-red-800 dark:bg-red-900/30"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                <svg
                  className="h-6 w-6 text-red-500 dark:text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p className="max-w-sm text-sm font-semibold text-red-700 dark:text-red-400">
                {errorMessage}
              </p>
              <button
                onClick={() => refetch()}
                className="mt-5 rounded-2xl border border-red-200 bg-white px-5 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Try Again
              </button>
            </motion.div>
          ) : filteredItems.length === 0 ? (
            /* Empty state */
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white py-24 text-center dark:border-slate-700 dark:bg-gray-800"
            >
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-sky-400 dark:bg-sky-900/30 dark:text-sky-500">
                <HeartIcon />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {search ? "No matching items" : "Your wishlist is empty"}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-gray-400">
                {search
                  ? "Try a different keyword."
                  : "Browse the shop and save products you love."}
              </p>
              <div className="mt-6 flex items-center gap-2">
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    Clear Search
                  </button>
                )}
                <Link
                  href={partnerProductHref}
                  className="rounded-2xl bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700"
                >
                  Browse Shop
                </Link>
              </div>
            </motion.div>
          ) : (
            /* Product list */
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item, index) => {
                  const productPath = `/product/${item.slug}-i${item.productId}`
                  const isRemoving = pendingRemoveId === item.productId

                  // Price computation matching ItemCard logic
                  const baseSrp =
                    Number(item.originalPrice) ?? Number(item.price) ?? 0
                  const srpPrice = Number(item.priceSrp) ?? baseSrp
                  const memberPrice =
                    Number(item.priceMember) ?? Number(item.priceDp) ?? 0
                  const hasMemberPrice =
                    memberPrice > 0 && memberPrice < srpPrice
                  const displayPrice = hasMemberPrice ? memberPrice : srpPrice
                  const strikePrice = hasMemberPrice
                    ? srpPrice
                    : item.originalPrice && item.originalPrice > srpPrice
                      ? item.originalPrice
                      : 0
                  const displayPv = Number(item.prodpv ?? 0)

                  return (
                    <motion.div
                      key={item.productId}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-gray-800"
                    >
                      {/* Product Image */}
                      <Link
                        href={productPath}
                        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl"
                      >
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gray-200 dark:bg-gray-600">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              className="text-gray-400 dark:text-gray-500"
                            >
                              <rect
                                x="3"
                                y="3"
                                width="18"
                                height="18"
                                rx="2"
                                ry="2"
                              />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                          </div>
                        )}
                      </Link>

                      {/* Product Info */}
                      <div className="min-w-0 flex-1">
                        <Link href={productPath} className="block">
                          <h2 className="line-clamp-2 text-sm font-semibold text-slate-800 transition-colors hover:text-sky-500 dark:text-gray-200 dark:hover:text-sky-400">
                            {item.name}
                          </h2>
                        </Link>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-sky-500 dark:text-sky-400">
                            ?{displayPrice.toLocaleString()}
                          </p>
                          {strikePrice > displayPrice && (
                            <p className="text-xs font-semibold text-slate-400 line-through dark:text-gray-500">
                              ?{strikePrice.toLocaleString()}
                            </p>
                          )}
                          {displayPv > 0 && (
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-400">
                              PV {displayPv.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Link
                            href={productPath}
                            className="flex items-center gap-1.5 rounded-xl bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-600"
                          >
                            <CartIcon /> Add to Cart
                          </Link>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemove(item.productId)}
                        disabled={isRemoving}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:text-gray-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        title="Remove from wishlist"
                      >
                        {isRemoving ? (
                          <svg
                            className="animate-spin"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                          </svg>
                        ) : (
                          <TrashIcon />
                        )}
                      </button>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
      {isPartnerStorefrontRoute ? (
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <p>
              Orders from{" "}
              <span className="font-semibold text-slate-800">
                {partnerName}
              </span>{" "}
              are still processed through AF Home.
            </p>
            {partnerBranding?.notificationEmail ? (
              <p>Partner notifications: {partnerBranding.notificationEmail}</p>
            ) : null}
          </div>
        </footer>
      ) : (
        <Footer />
      )}
    </>
  )
}
