'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAddToCartMutation, useGetCartQuery } from '@/store/api/cartApi'
import { useGetWishlistQuery, useAddWishlistMutation, useRemoveWishlistMutation } from '@/store/api/wishlistApi'
import { useLazyGetPublicProductQuery } from '@/store/api/productsApi'
import { useMeQuery } from '@/store/api/userApi'
import { useSubmitServiceInquiryMutation } from '@/store/api/serviceInquiriesApi'
import { useCart } from '@/context/CartContext'
import toast from 'react-hot-toast'
import ShareModal from '@/components/ui/ShareModal'
import { buildStorefrontProductPath } from '@/libs/storefrontRouting'

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const formatPeso = (value: number) => `\u20b1${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
const GUEST_WISHLIST_STORAGE_KEY = 'synergy_guest_wishlist_product_ids'
const GUEST_WISHLIST_ITEMS_STORAGE_KEY = 'synergy_guest_wishlist_items'

type GuestWishlistItem = {
  productId: number
  name: string
  price: number
  priceMember?: number
  priceDp?: number
  priceSrp?: number
  originalPrice?: number
  sku?: string
  prodpv?: number
  image: string
  slug: string
  brand?: string | null
}

const readGuestWishlistItems = (): GuestWishlistItem[] => {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(GUEST_WISHLIST_ITEMS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []

    const normalized = parsed
      .map((entry): GuestWishlistItem | null => {
        if (!entry || typeof entry !== 'object') return null
        const row = entry as Record<string, unknown>
        const productId = Number(row.productId ?? 0)
        if (!Number.isInteger(productId) || productId <= 0) return null
        return {
          productId,
          name: typeof row.name === 'string' ? row.name : `Product ${productId}`,
          price: Number(row.price ?? 0),
          priceMember: Number(row.priceMember ?? 0) || undefined,
          priceDp: Number(row.priceDp ?? 0) || undefined,
          priceSrp: Number(row.priceSrp ?? 0) || undefined,
          originalPrice: Number(row.originalPrice ?? 0) || undefined,
          sku: typeof row.sku === 'string' ? row.sku : undefined,
          prodpv: Number(row.prodpv ?? 0) || undefined,
          image: typeof row.image === 'string' && row.image.trim().length > 0 ? row.image : '/Images/af_home_logo.png',
          slug: typeof row.slug === 'string' && row.slug.trim().length > 0 ? row.slug : toSlug(typeof row.name === 'string' ? row.name : `product-${productId}`),
          brand: typeof row.brand === 'string' ? row.brand : null,
        } satisfies GuestWishlistItem
      })
      .filter((item): item is GuestWishlistItem => Boolean(item))

    // Backward compatibility: if old ID-only storage exists, keep heart state.
    if (normalized.length > 0) return normalized
    const oldRaw = window.localStorage.getItem(GUEST_WISHLIST_STORAGE_KEY)
    const oldParsed = oldRaw ? JSON.parse(oldRaw) : []
    if (!Array.isArray(oldParsed)) return []
    return oldParsed
      .map((entry) => Number(entry))
      .filter((entry) => Number.isInteger(entry) && entry > 0)
      .map((productId) => ({
        productId,
        name: `Product ${productId}`,
        price: 0,
        image: '/Images/af_home_logo.png',
        slug: `product-${productId}`,
        brand: null,
      }))
  } catch {
    return []
  }
}

interface Product {
  id: number
  name: string
  type?: number
  manualCheckoutEnabled?: boolean
  image?: string | null
  price?: number | null
  priceMember?: number | null
  priceDp?: number | null
  priceSrp?: number | null
  originalPrice?: number | null
  sku?: string | null
  prodpv?: number | null
  bestseller?: boolean
  soldCount?: number
  avgRating?: number
  variants?: ProductVariant[] | null
  material?: string | null
  warranty?: string | null
  description?: string | null
}

interface ProductVariant {
  id?: number
  sku?: string
  name?: string
  color?: string
  colorHex?: string
  size?: string
  style?: string
  priceSrp?: number
  priceDp?: number
  priceMember?: number
  prodpv?: number
  qty?: number
  status?: number
  images?: string[]
}

interface ItemCardProps {
  product: Product
  brandName: string
  hideDiscountBadge?: boolean
  forceRealPrice?: boolean
  allowGuestAddToCart?: boolean
  allowGuestWishlist?: boolean
  isServicesCategory?: boolean
}

export default function ItemCard({
  product,
  brandName,
  hideDiscountBadge = false,
  forceRealPrice = false,
  allowGuestAddToCart = false,
  allowGuestWishlist = false,
  isServicesCategory = false,
}: ItemCardProps) {
  const slug = toSlug(product.name)
  const pathname = usePathname()
  const router = useRouter()
  const href = buildStorefrontProductPath(product.name, product.id, pathname)
  const [imageError, setImageError] = useState(false)
  const { data: session, status } = useSession()
  const role = String(session?.user?.role ?? '').toLowerCase()
  const isLoggedIn = status === 'authenticated' && role === 'customer'
  // Logged-in customers should always use account-backed cart/wishlist so data survives refresh/navigation.
  const useAccountCart = isLoggedIn
  const useAccountWishlist = isLoggedIn
  const { data: meData } = useMeQuery(undefined, { skip: !isLoggedIn })
  const [submitInquiry, { isLoading: isSubmittingInquiry }] = useSubmitServiceInquiryMutation()
  const [addToCartApi, { isLoading: isAddingToCart }] = useAddToCartMutation()
  const [loadProductDetails, { isFetching: isFetchingProductDetails }] = useLazyGetPublicProductQuery()
  const { setIsOpen, addToCart: addToLocalCart } = useCart()
  const { refetch: refetchCart } = useGetCartQuery(undefined, { skip: !useAccountCart })
  const [shareModalOpen, setShareModalOpen] = useState(false)
  
  // Wishlist functionality
  const { data: wishlist = [] } = useGetWishlistQuery(undefined, { skip: !useAccountWishlist })
  const [addWishlist, { isLoading: isAddingToWishlist }] = useAddWishlistMutation()
  const [removeWishlist, { isLoading: isRemovingFromWishlist }] = useRemoveWishlistMutation()
  const [guestWishlistItems, setGuestWishlistItems] = useState<GuestWishlistItem[]>(() => readGuestWishlistItems())
  const [variantPickerOpen, setVariantPickerOpen] = useState(false)
  const [openCartAfterVariantPicker, setOpenCartAfterVariantPicker] = useState(false)
  const [serviceModalOpen, setServiceModalOpen] = useState(false)
  const [inquireModalOpen, setInquireModalOpen] = useState(false)
  const [inquireForm, setInquireForm] = useState({ fullname: '', email: '', contact: '', address: '', intent: '' })
  const [inquireSubmitted, setInquireSubmitted] = useState(false)
  const serviceTypes = useMemo(
    () => isServicesCategory && product.material
      ? product.material.split(',').map(s => s.trim()).filter(Boolean)
      : [],
    [isServicesCategory, product.material],
  )
  const [loadedVariants, setLoadedVariants] = useState<ProductVariant[] | null>(null)
  const activeVariants = useMemo(
    () => (loadedVariants ?? product.variants ?? []).filter((variant) => (variant.status ?? 1) === 1),
    [loadedVariants, product.variants],
  )
  const hasVariants = activeVariants.length > 0
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0)
  const selectedVariant = activeVariants[selectedVariantIndex] ?? activeVariants[0]
  const selectedColor = selectedVariant?.color ?? ''
  const colorOptions = useMemo(() => {
    const map = new Map<string, string | undefined>()
    activeVariants.forEach((variant) => {
      const color = variant.color?.trim()
      if (!color) return
      map.set(color, variant.colorHex)
    })
    return Array.from(map.entries()).map(([name, hex]) => ({ name, hex }))
  }, [activeVariants])
  const visibleVariants = useMemo(
    () => selectedColor ? activeVariants.filter((variant) => !variant.color || variant.color === selectedColor) : activeVariants,
    [activeVariants, selectedColor],
  )

  useEffect(() => {
    setSelectedVariantIndex(0)
    setLoadedVariants(null)
  }, [product.id])

  useEffect(() => {
    if (useAccountWishlist || !allowGuestWishlist || typeof window === 'undefined') return

    const syncGuestWishlist = () => {
      setGuestWishlistItems(readGuestWishlistItems())
    }

    window.addEventListener('synergy:guest-wishlist-updated', syncGuestWishlist)
    window.addEventListener('storage', syncGuestWishlist)
    return () => {
      window.removeEventListener('synergy:guest-wishlist-updated', syncGuestWishlist)
      window.removeEventListener('storage', syncGuestWishlist)
    }
  }, [allowGuestWishlist, useAccountWishlist])

  const isInWishlist = useAccountWishlist
    ? wishlist.some(item => item.productId === product.id)
    : guestWishlistItems.some((item) => item.productId === product.id)

  const addSelectedItemToCart = async (variant?: ProductVariant) => {
    const shouldWaitForPickerExit = variantPickerOpen

    if (!useAccountCart) {
      if (allowGuestAddToCart) {
        const variantLabel = [variant?.name, variant?.style, variant?.size, variant?.color].filter(Boolean).join(' - ')
        const variantPrice = getVariantDisplayPrice(variant)
        addToLocalCart({
          id: variant?.sku ? `${product.id}::${variant.sku}` : String(product.id),
          productId: product.id,
          variantId: variant?.id,
          name: variantLabel ? `${product.name} (${variantLabel})` : product.name,
          price: variantPrice.display,
          originalPrice: variantPrice.strike > variantPrice.display ? variantPrice.strike : null,
          image: variant?.images?.[0] ?? product.image ?? '',
          prodpv: variantPrice.pv > 0 ? variantPrice.pv : null,
          brand: brandName || null,
          manualCheckoutEnabled: Boolean(product.manualCheckoutEnabled),
          selectedColor: variant?.color ?? null,
          selectedStyle: variant?.style ?? null,
          selectedSize: variant?.size ?? null,
          selectedType: variant?.name ?? null,
          selectedSku: variant?.sku ?? null,
        })
        toast.success('Item added to cart successfully')
        if (shouldWaitForPickerExit) {
          setOpenCartAfterVariantPicker(true)
          setVariantPickerOpen(false)
        } else {
          setIsOpen(true)
        }
        return
      }
      router.push(`/login?callback=${encodeURIComponent(pathname || href)}`)
      return
    }

    try {
      await addToCartApi({
        product_id: product.id,
        variant_id: variant?.id,
        quantity: 1,
        selected_color: variant?.color,
        selected_size: variant?.size,
        selected_type: variant?.name || variant?.style,
      }).unwrap()
      toast.success('Item added to cart successfully')
      if (shouldWaitForPickerExit) {
        setOpenCartAfterVariantPicker(true)
        setVariantPickerOpen(false)
      } else {
        setIsOpen(true)
      }
      // Refetch cart to sync with backend
      refetchCart()
    } catch (error: any) {
      if (allowGuestAddToCart) {
        const variantLabel = [variant?.name, variant?.style, variant?.size, variant?.color].filter(Boolean).join(' - ')
        const variantPrice = getVariantDisplayPrice(variant)
        addToLocalCart({
          id: variant?.sku ? `${product.id}::${variant.sku}` : String(product.id),
          productId: product.id,
          variantId: variant?.id,
          name: variantLabel ? `${product.name} (${variantLabel})` : product.name,
          price: variantPrice.display,
          originalPrice: variantPrice.strike > variantPrice.display ? variantPrice.strike : null,
          image: variant?.images?.[0] ?? product.image ?? '',
          prodpv: variantPrice.pv > 0 ? variantPrice.pv : null,
          brand: brandName || null,
          manualCheckoutEnabled: Boolean(product.manualCheckoutEnabled),
          selectedColor: variant?.color ?? null,
          selectedStyle: variant?.style ?? null,
          selectedSize: variant?.size ?? null,
          selectedType: variant?.name ?? null,
          selectedSku: variant?.sku ?? null,
        })
        toast.success('Item added to cart successfully')
        if (shouldWaitForPickerExit) {
          setOpenCartAfterVariantPicker(true)
          setVariantPickerOpen(false)
        } else {
          setIsOpen(true)
        }
        return
      }

      const errorMessage = error?.data?.message || error?.message || 'Failed to add item to cart'
      toast.error(errorMessage)
    }
  }

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (hasVariants) {
      setVariantPickerOpen(true)
      return
    }

    if (loadedVariants === null) {
      try {
        const productDetails = await loadProductDetails(product.id).unwrap()
        const fetchedVariants = (productDetails.variants ?? []).filter((variant) => (variant.status ?? 1) === 1)
        setLoadedVariants(fetchedVariants)

        if (fetchedVariants.length > 0) {
          setSelectedVariantIndex(0)
          setVariantPickerOpen(true)
          return
        }
      } catch {
        toast.error('Unable to load product options. Please open the product page to choose a variant.')
        return
      }
    }

    await addSelectedItemToCart()
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShareModalOpen(true)
  }

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!useAccountWishlist) {
      if (allowGuestWishlist && typeof window !== 'undefined') {
        const currentItems = readGuestWishlistItems()
        const currentlyInWishlist = currentItems.some((item) => item.productId === product.id)
        const nextItems = currentlyInWishlist
          ? currentItems.filter((item) => item.productId !== product.id)
          : [
              ...currentItems,
              {
                productId: product.id,
                name: product.name,
                price: Number(product.price ?? 0),
                priceMember: product.priceMember ? Number(product.priceMember) : undefined,
                priceDp: product.priceDp ? Number(product.priceDp) : undefined,
                priceSrp: product.priceSrp ? Number(product.priceSrp) : undefined,
                originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
                sku: product.sku ?? undefined,
                prodpv: product.prodpv ? Number(product.prodpv) : undefined,
                image: product.image ?? '/Images/af_home_logo.png',
                slug,
                brand: brandName || null,
              },
            ]
        const deduped = Array.from(
          nextItems.reduce((map, item) => {
            map.set(item.productId, item)
            return map
          }, new Map<number, GuestWishlistItem>()).values(),
        )
        setGuestWishlistItems(deduped)
        window.localStorage.setItem(GUEST_WISHLIST_ITEMS_STORAGE_KEY, JSON.stringify(deduped))
        window.localStorage.setItem(GUEST_WISHLIST_STORAGE_KEY, JSON.stringify(deduped.map((item) => item.productId)))
        window.dispatchEvent(new CustomEvent('synergy:guest-wishlist-updated'))
        toast.success(currentlyInWishlist ? 'Removed from wishlist' : 'Added to wishlist')
        return
      }
      toast.error('Please sign in to add items to wishlist')
      return
    }

    try {
      if (isInWishlist) {
        await removeWishlist(product.id).unwrap()
        toast.success('Removed from wishlist')
      } else {
        await addWishlist({ 
          product_id: product.id,
          product_name: product.name 
        }).unwrap()
        toast.success('Added to wishlist')
      }
    } catch (error: any) {
      console.error('Wishlist error:', error)
      const errorMessage = error?.data?.message || error?.message || 'Failed to update wishlist'
      toast.error(errorMessage)
    }
  }

  const baseSrp =
    (product.originalPrice ? Number(product.originalPrice) : undefined) ?? (product.price ? Number(product.price) : undefined) ?? 0

  const srpPrice = (product.priceSrp ? Number(product.priceSrp) : undefined) ?? baseSrp

  const memberPrice =
    (product.priceMember ? Number(product.priceMember) : undefined) ?? (product.priceDp ? Number(product.priceDp) : undefined) ?? 0

  const hasMemberPrice = memberPrice > 0 && memberPrice < srpPrice

  const canUseMemberPrice = isLoggedIn && status === 'authenticated'
  const shouldDisplayMemberPrice = hasMemberPrice && !forceRealPrice && canUseMemberPrice

  const displayPrice = shouldDisplayMemberPrice ? memberPrice : srpPrice

  const strikePrice =
    product.originalPrice && product.originalPrice > srpPrice && !shouldDisplayMemberPrice
      ? Number(product.originalPrice)
      : 0
  const displayPv = Number(product.prodpv ?? 0)
  const getVariantDisplayPrice = (variant?: ProductVariant) => {
    const variantSrp = (variant?.priceSrp ? Number(variant.priceSrp) : undefined) ?? srpPrice
    const variantMember = (variant?.priceMember ? Number(variant.priceMember) : undefined) ?? memberPrice
    const variantHasMemberPrice = variantMember > 0 && variantMember < variantSrp
    const variantStrikeBase = variantSrp
    const variantOriginal = variant?.priceSrp ? variant?.priceSrp : variant?.priceDp ?? variant?.priceMember
    const variantStrike =
      variantOriginal && Number(variantOriginal) > variantStrikeBase ? Number(variantOriginal) : 0
    const variantPv = Number(variant?.prodpv ?? displayPv)
    return { display: variantSrp, strike: variantStrike, pv: variantPv, variantHasMemberPrice }
  }
  const averageRating = Math.max(0, Math.min(5, Number(product.avgRating ?? 0)))
  const hasRating = averageRating > 0
  const filledStars = Math.floor(averageRating)
  const soldCount = Number(product.soldCount ?? 0)

  return (
    <>
    <Link
      href={isServicesCategory ? '#' : href}
      onClick={isServicesCategory ? (e) => e.preventDefault() : undefined}
      className={`flex flex-col group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-colors ${isServicesCategory ? 'cursor-default' : 'hover:border-sky-500 dark:hover:border-sky-400 cursor-pointer'}`}
    >
      {/* Product Image */}
      <div className="relative aspect-square w-full bg-gray-100 dark:bg-gray-700 overflow-hidden border-b border-gray-200 dark:border-gray-700">
        {/* Action Icons */}
        <div className="absolute top-2 right-2 flex flex-col gap-2 z-10">
          {!isServicesCategory && <div className="relative">
            <button
            onClick={handleWishlist}
            disabled={isAddingToWishlist || isRemovingFromWishlist}
            className={`p-2 rounded-full backdrop-blur-md border shadow-lg transition-all duration-200 cursor-pointer hover:cursor-hand ${
              isInWishlist 
                ? 'bg-sky-500 border-sky-500 hover:bg-sky-600 hover:border-sky-600' 
                : 'bg-white/90 dark:bg-gray-800/90 border-gray-200 dark:border-gray-600 hover:bg-sky-500 hover:border-sky-500 dark:hover:bg-sky-500 dark:hover:border-sky-500'
            } ${isAddingToWishlist || isRemovingFromWishlist ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
          >
            {(isAddingToWishlist || isRemovingFromWishlist) ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill={isInWishlist ? "white" : "none"} 
                stroke={isInWishlist ? "white" : "currentColor"} 
                strokeWidth="2" 
                className={`transition-colors ${isInWishlist ? 'text-white' : 'text-gray-700 dark:text-gray-300 hover:text-white'}`}
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            )}
          </button>
          </div>}
          {!isServicesCategory && <button
            onClick={handleShare}
            className="p-2 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-600 shadow-lg hover:bg-sky-500 hover:border-sky-500 dark:hover:bg-sky-500 dark:hover:border-sky-500 transition-all duration-200 cursor-pointer hover:cursor-hand"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700 dark:text-gray-300 hover:text-white transition-colors">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>}
        </div>
        {product.image && !imageError ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            unoptimized
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400 dark:text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-0 left-0 flex flex-col">
          {hasMemberPrice && !hideDiscountBadge && isLoggedIn && (
            <div className="bg-sky-500 text-white text-xs font-bold px-2 py-1">
              Enjoy {Math.round(((srpPrice - memberPrice) / srpPrice) * 100)}% off
            </div>
          )}
          {product.bestseller && (
            <div className="bg-purple-500 text-white text-xs font-bold px-2 py-1">
              Bestseller
            </div>
          )}
        </div>

        {/* View Details Button (services only) */}
        {isServicesCategory && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setServiceModalOpen(true) }}
            className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg transition-all duration-300 hover:bg-sky-600 sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-2 sm:text-sm sm:font-semibold sm:opacity-0 sm:translate-y-2 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6M8 11h6"/>
            </svg>
            <span className="hidden sm:inline">View Details</span>
          </button>
        )}

        {/* Add to Cart Button */}
        {!isServicesCategory && (
          <button
            onClick={handleAddToCart}
            disabled={isAddingToCart || isFetchingProductDetails}
            className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg transition-all duration-300 hover:bg-sky-600 sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-2 sm:text-sm sm:font-semibold sm:opacity-0 sm:translate-y-2 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 cursor-pointer hover:cursor-hand disabled:opacity-50 disabled:cursor-not-allowed"
            title="Add to Cart"
            aria-label="Add to Cart"
          >
            {isAddingToCart || isFetchingProductDetails ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span className="hidden sm:inline">{isFetchingProductDetails ? 'Loading...' : 'Adding...'}</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                <span className="hidden sm:inline">Add to Cart</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Product Info */}
      {isServicesCategory ? (
        <div className="flex flex-col gap-2 px-2.5 sm:px-3 py-2.5 sm:py-3">
          <div>
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-sky-500">Company</p>
            <h3 className="line-clamp-1 text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 leading-snug">
              {product.name}
            </h3>
          </div>
          <div>
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Services</p>
            {serviceTypes.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {serviceTypes.map((type) => (
                  <span key={type} className="rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[9px] sm:text-[10px] font-medium text-sky-600 dark:bg-sky-900/20 dark:border-sky-800 dark:text-sky-300">
                    {type}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-gray-400 dark:text-gray-500">—</span>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-1 flex flex-col gap-1 px-2.5 sm:px-3 py-2.5 sm:py-3">
          {brandName && (
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
              {brandName}
            </p>
          )}
          <h3 className="line-clamp-2 text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-snug min-h-[2.5rem]">
            {product.name}
          </h3>

          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-2">
            <div className="flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-sm sm:text-base font-bold text-sky-500 dark:text-sky-400">
                {'₱'}{displayPrice.toLocaleString()}
              </span>
              {strikePrice > displayPrice && (
                <span className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 line-through">
                  {'₱'}{strikePrice.toLocaleString()}
                </span>
              )}
            </div>
            {isLoggedIn && displayPv > 0 && (
              <span className="rounded-full border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 px-1 sm:px-2 py-0.5 text-[8px] sm:text-[11px] font-semibold text-blue-700 dark:text-blue-300 shrink-0 whitespace-nowrap w-fit">
                PV {displayPv.toLocaleString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  xmlns="http://www.w3.org/2000/svg"
                  width="9"
                  height="9"
                  viewBox="0 0 24 24"
                  fill={hasRating && star <= filledStars ? '#38bdf8' : 'none'}
                  stroke={hasRating && star <= filledStars ? '#38bdf8' : '#d1d5db'}
                  strokeWidth="2"
                  className="sm:w-[10px] sm:h-[10px]"
                >
                  <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              ))}
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {hasRating ? `${averageRating.toFixed(1)} · ` : ''}{(soldCount ?? 0)} sold
            </span>
          </div>
        </div>
      )}
    </Link>

    {/* Share Modal */}
    <ShareModal
      isOpen={shareModalOpen}
      onClose={() => setShareModalOpen(false)}
      product={product}
      brandName={brandName}
      shareUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}${href}`}
      forceRealPrice={forceRealPrice}
    />

    {/* Service Detail Modal */}
    <AnimatePresence>
      {serviceModalOpen && (
        <motion.div
          key="service-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setServiceModalOpen(false)}
        >
          <motion.div
            key="service-modal-panel"
            initial={{ y: 24, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-900/30">
                  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-500">
                    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Service Details</p>
                  <h3 className="line-clamp-1 text-base font-bold text-gray-900 dark:text-white">{product.name}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setServiceModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="max-h-[75vh] overflow-y-auto">
              {/* Hero banner */}
              <div className="relative mx-4 mb-1 overflow-hidden rounded-2xl bg-gradient-to-br from-sky-50 to-blue-100 p-5 dark:from-sky-900/30 dark:to-blue-900/20">
                <span className="absolute right-4 top-3 text-lg text-sky-300 dark:text-sky-500">✦</span>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-sky-500 dark:text-sky-400">Hello there! 👋</p>
                    <p className="mt-1 text-base font-bold leading-snug text-gray-900 dark:text-white">Professional service you can count on.</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{"We're here to make things simple, safe and stress-free for you."}</p>
                  </div>
                  {product.image && (
                    <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl">
                      <Image src={product.image} alt={product.name} fill className="object-cover" unoptimized />
                    </div>
                  )}
                </div>
              </div>

              <div className="px-4 pb-4">
                {/* Company */}
                <div className="flex items-center gap-3 border-b border-gray-100 py-4 dark:border-gray-800">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500 dark:text-gray-400">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Company</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{product.name}</p>
                  </div>
                </div>

                {/* Services Offered */}
                {serviceTypes.length > 0 && (
                  <div className="border-b border-gray-100 py-4 dark:border-gray-800">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Services Offered</p>
                    <div className="flex flex-wrap gap-2">
                      {serviceTypes.map((type, i) => {
                        const palette = [
                          { wrap: 'bg-sky-50 border-sky-100 text-sky-600 dark:bg-sky-900/20 dark:border-sky-800 dark:text-sky-300' },
                          { wrap: 'bg-pink-50 border-pink-100 text-pink-600 dark:bg-pink-900/20 dark:border-pink-800 dark:text-pink-300' },
                          { wrap: 'bg-violet-50 border-violet-100 text-violet-600 dark:bg-violet-900/20 dark:border-violet-800 dark:text-violet-300' },
                          { wrap: 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300' },
                          { wrap: 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300' },
                        ]
                        const c = palette[i % palette.length]
                        return (
                          <span key={type} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${c.wrap}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            {type}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* About */}
                {product.description && (
                  <div className="flex gap-3 border-b border-gray-100 py-4 dark:border-gray-800">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-emerald-200 dark:border-emerald-700">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">About</p>
                      <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{product.description.replace(/<[^>]*>/g, '').trim()}</p>
                    </div>
                  </div>
                )}

                {/* CTA + trust badges */}
                <div className="mt-4 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/60">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sky-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                          <path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Have questions or need more info?</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{"We're happy to help you."}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setServiceModalOpen(false)
                        setInquireSubmitted(false)
                        setInquireForm({
                          fullname: meData ? [meData.first_name, meData.middle_name, meData.last_name].filter(Boolean).join(' ') : '',
                          email: meData?.email ?? '',
                          contact: meData?.phone ?? '',
                          address: [meData?.address, meData?.barangay, meData?.city, meData?.province].filter(Boolean).join(', '),
                          intent: '',
                        })
                        setInquireModalOpen(true)
                      }}
                      className="flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-sky-600 active:scale-[0.98]"
                    >
                      Inquire Now
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                      </svg>
                    </button>
                  </div>

                  {/* Trust badges */}
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
                    <div className="flex flex-col items-center gap-1 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200">Trusted Professionals</p>
                      <p className="text-[10px] text-gray-400">Verified &amp; experienced</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-500">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200">Quick Response</p>
                      <p className="text-[10px] text-gray-400">We reply fast</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200">Satisfaction Guaranteed</p>
                      <p className="text-[10px] text-gray-400">Your happiness matters</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Inquire Modal */}
    <AnimatePresence>
      {inquireModalOpen && (
        <motion.div
          key="inquire-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          onClick={() => setInquireModalOpen(false)}
        >
          <motion.div
            key="inquire-modal-panel"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md overflow-hidden rounded-t-2xl sm:rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-4 sm:px-5 py-4 sm:py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-sky-50 dark:bg-sky-900/30">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-500">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-sky-500">Inquiry</p>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">{product.name}</h3>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{"Please fill in your details and we'll get back to you shortly."}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInquireModalOpen(false)}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-500 dark:hover:bg-gray-800"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </button>
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-800" />

            {inquireSubmitted ? (
              <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <p className="text-base font-bold text-gray-900 dark:text-white">Thank you for your inquiry!</p>
                <p className="max-w-xs text-sm leading-relaxed text-gray-500 dark:text-gray-400">Our team will review your request and contact you soon. Please ensure all submitted information is accurate and up to date.</p>
                <button
                  type="button"
                  onClick={() => setInquireModalOpen(false)}
                  className="mt-2 rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-sky-600"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="max-h-[55vh] overflow-y-auto space-y-4 px-4 sm:px-6 py-4 sm:py-5">
                  {/* Full Name */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-gray-300">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                      </span>
                      <input
                        type="text"
                        value={inquireForm.fullname}
                        onChange={(e) => setInquireForm(f => ({ ...f, fullname: e.target.value }))}
                        placeholder="Enter your full name"
                        className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm text-gray-800 outline-none placeholder:text-gray-300 transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus:border-sky-500"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-gray-300">
                      Email <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300">
                          <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                        </svg>
                      </span>
                      <input
                        type="email"
                        value={inquireForm.email}
                        onChange={(e) => setInquireForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="Enter your email"
                        className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm text-gray-800 outline-none placeholder:text-gray-300 transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus:border-sky-500"
                      />
                    </div>
                  </div>

                  {/* Contact */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-gray-300">
                      Contact Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.6 5.06 2 2 0 0 1 3.58 2.87h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 10.5a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                        </svg>
                      </span>
                      <input
                        type="tel"
                        value={inquireForm.contact}
                        onChange={(e) => setInquireForm(f => ({ ...f, contact: e.target.value }))}
                        placeholder="Enter your contact number"
                        className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm text-gray-800 outline-none placeholder:text-gray-300 transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus:border-sky-500"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-gray-300">
                      Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300">
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                      </span>
                      <textarea
                        value={inquireForm.address}
                        onChange={(e) => setInquireForm(f => ({ ...f, address: e.target.value }))}
                        placeholder="Enter your address"
                        rows={3}
                        className="w-full resize-none rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm text-gray-800 outline-none placeholder:text-gray-300 transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus:border-sky-500"
                      />
                    </div>
                  </div>

                  {/* Intent */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-gray-300">
                      Intent / Message <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                      </span>
                      <textarea
                        value={inquireForm.intent}
                        onChange={(e) => setInquireForm(f => ({ ...f, intent: e.target.value }))}
                        placeholder="Describe what you need or your purpose for this inquiry..."
                        rows={3}
                        className="w-full resize-none rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm text-gray-800 outline-none placeholder:text-gray-300 transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus:border-sky-500"
                      />
                    </div>
                  </div>

                  {/* Privacy notice */}
                  <div className="flex items-center gap-3 rounded-xl bg-sky-50 px-4 py-3 dark:bg-sky-900/20">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sky-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Your information is safe with us.</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">{"We'll never share your details with anyone."}</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 border-t border-gray-100 px-4 sm:px-5 py-3 sm:py-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setInquireModalOpen(false)}
                    className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingInquiry || !inquireForm.fullname.trim() || !inquireForm.email.trim() || !inquireForm.contact.trim() || !inquireForm.address.trim() || !inquireForm.intent.trim()}
                    onClick={async () => {
                      try {
                        await submitInquiry({
                          product_id: product.id as number,
                          fullname: inquireForm.fullname.trim(),
                          email: inquireForm.email.trim(),
                          contact: inquireForm.contact.trim(),
                          address: inquireForm.address.trim(),
                          intent: inquireForm.intent.trim(),
                        }).unwrap()
                        setInquireSubmitted(true)
                      } catch {
                        toast.error('Failed to send inquiry. Please try again.')
                      }
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 py-3 text-sm font-bold text-white transition-all hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
                    </svg>
                    {isSubmittingInquiry ? 'Sending...' : 'Send Inquiry'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>


    <AnimatePresence
      onExitComplete={() => {
        if (openCartAfterVariantPicker) {
          setOpenCartAfterVariantPicker(false)
          setIsOpen(true)
        }
      }}
    >
      {variantPickerOpen && (
      <motion.div
        key="variant-picker-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
        onClick={() => setVariantPickerOpen(false)}
      >
        <motion.div
          key="variant-picker-panel"
          initial={{ y: 36, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 52, opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-sky-500">Select Variant</p>
              <h3 className="line-clamp-1 text-base font-bold text-gray-900 dark:text-white">{product.name}</h3>
            </div>
            <button
              type="button"
              onClick={() => setVariantPickerOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="Close variant picker"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-4">
            {colorOptions.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Color{selectedColor ? `: ${selectedColor}` : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => {
                    const firstIndex = activeVariants.findIndex((variant) => variant.color === color.name)
                    const isActive = selectedColor === color.name
                    return (
                      <button
                        key={color.name}
                        type="button"
                        title={color.name}
                        onClick={() => setSelectedVariantIndex(Math.max(0, firstIndex))}
                        className={`h-10 w-10 rounded-full border-2 transition hover:scale-105 ${
                          isActive ? 'ring-4 ring-sky-400' : 'ring-2 ring-transparent'
                        }`}
                        style={{ backgroundColor: color.hex ?? '#E5E7EB', borderColor: '#D1D5DB' }}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                {visibleVariants.some((variant) => variant.size?.trim()) ? 'Size' : 'Variant'}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {visibleVariants.map((variant) => {
                  const realIndex = activeVariants.findIndex((entry) => entry === variant)
                  const isActive = activeVariants[selectedVariantIndex] === variant
                  const variantPrice = getVariantDisplayPrice(variant)
                  const label = variant.size?.trim() || variant.name?.trim() || variant.style?.trim() || variant.sku?.trim() || 'Option'
                  const meta = [variant.name, variant.style, variant.color, variant.sku].filter(Boolean).join(' - ')
                  return (
                    <button
                      key={`${variant.id ?? variant.sku ?? realIndex}-${realIndex}`}
                      type="button"
                      onClick={() => setSelectedVariantIndex(Math.max(0, realIndex))}
                      className={`rounded-lg border-2 p-2 text-left transition ${
                        isActive
                          ? 'border-sky-400 text-sky-600'
                          : 'border-gray-200 text-gray-700 hover:border-sky-200 dark:border-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex gap-2">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-50 dark:border-gray-700">
                          <Image
                            src={variant.images?.[0] || product.image || '/Images/af_home_logo.png'}
                            alt={label}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold">{label}</p>
                            {isActive && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-600">Selected</span>}
                          </div>
                          {meta && <p className="mt-0.5 truncate text-[11px] text-gray-400">{meta}</p>}
                          <p className="mt-1 text-xs font-bold text-sky-500">{'\u20b1'}{variantPrice.display.toLocaleString()}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-2 border-t border-gray-200 p-4 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setVariantPickerOpen(false)}
              className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => addSelectedItemToCart(selectedVariant)}
              disabled={isAddingToCart || !selectedVariant}
              className="flex-[1.5] rounded-full bg-sky-500 px-4 py-2 text-sm font-bold text-white hover:bg-sky-600 disabled:opacity-50"
            >
              {isAddingToCart ? 'Adding...' : 'Add Selected to Cart'}
            </button>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  </>
  )
}
