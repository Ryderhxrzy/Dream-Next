"use client"

/* eslint-disable react-hooks/set-state-in-effect */
import { Fragment, useEffect, useMemo, useState } from "react"
import { normalizeCategorySlug } from "@/libs/partnerStorefront"
import { ROOM_OPTIONS } from "@/libs/roomConfig"
import type { Category } from "@/store/api/categoriesApi"
import { usePathname, useRouter } from "next/navigation"

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

export interface FilterState {
  priceRange: [number, number]
  sortBy: "default" | "asc" | "desc"
  inStock: boolean
  discountOnly: boolean
  minDiscount: number
  pvRange: [number, number]
  search: string
  hasPvOnly: boolean
  brand?: string
}

interface Brand {
  id: number
  name: string
  status?: number
}

interface ProductFilterProps {
  onFilterChange: (filters: FilterState) => void
  className?: string
  pvRange?: [number, number]
  search?: string
  categories?: Category[]
  currentCategory?: string
  maxPrice?: number
  isBrandPage?: boolean
  brands?: Brand[]
  currentBrand?: string
  isRoomPage?: boolean
  currentRoom?: string
  onCategorySelect?: (category: Category | null) => void
  subCategories?: Category[]
  currentSubCategory?: string
  onSubCategorySelect?: (category: Category | null) => void
}

export default function ProductFilter({
  onFilterChange,
  className = "",
  pvRange: propPvRange = [0, 5000],
  search: propSearch = "",
  categories = [],
  currentCategory,
  maxPrice = 10000,
  isBrandPage = false,
  brands = [],
  currentBrand,
  isRoomPage = false,
  currentRoom,
  onCategorySelect,
  subCategories = [],
  currentSubCategory,
  onSubCategorySelect,
}: ProductFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [priceRange, setPriceRange] = useState<[number, number]>([0, maxPrice])
  const [sortBy, setSortBy] = useState<"default" | "asc" | "desc">("default")
  const [inStockOnly, setInStockOnly] = useState(false)
  const [discountOnly, setDiscountOnly] = useState(false)
  const [minDiscount, setMinDiscount] = useState(0)
  const [pvRange, setPvRange] = useState<[number, number]>(propPvRange)
  const [hasPvOnly, setHasPvOnly] = useState(false)
  const [showPvInfo, setShowPvInfo] = useState(false)
  const [showAllBrands, setShowAllBrands] = useState(false)
  const [brandSearch, setBrandSearch] = useState("")
  const [selectedBrand, setSelectedBrand] = useState(currentBrand ?? "")
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const parentCategories = useMemo(
    () =>
      categories.filter(
        (c) => c.parent_id === null || c.parent_id === undefined
      ),
    [categories]
  )
  const childrenByParentId = useMemo(() => {
    const map: Record<number, Category[]> = {}
    for (const c of categories) {
      if (c.parent_id) {
        if (!map[c.parent_id]) map[c.parent_id] = []
        map[c.parent_id].push(c)
      }
    }
    return map
  }, [categories])
  const currentParentId = useMemo(() => {
    const matched = categories.find((c) => c.name === currentCategory)
    return matched?.parent_id ?? null
  }, [categories, currentCategory])

  const shopPathMatch = pathname.match(
    /^\/shop\/([^/]+)\/(?:product|category(?:\/[^/]+)?)\/?$/i
  )
  const partnerSlugFromPath = shopPathMatch?.[1]
  const hasAllCategorySelected =
    !currentCategory ||
    currentCategory.toLowerCase() === "all products" ||
    currentCategory.toLowerCase() === "all category"

  const resolveCategorySlug = (category: Category) =>
    normalizeCategorySlug(category.url, category.name)

  const getAllCategoryPath = () =>
    partnerSlugFromPath ? `/shop/${partnerSlugFromPath}/product` : "/category"

  const getPartnerHomePath = () =>
    partnerSlugFromPath ? `/shop/${partnerSlugFromPath}` : "/"

  const getCategoryPath = (category: Category) => {
    const categorySlug = resolveCategorySlug(category)
    if (partnerSlugFromPath) {
      return `/shop/${partnerSlugFromPath}/category/${categorySlug}`
    }
    return `/category/${categorySlug}`
  }

  const discountPresets = [
    { label: "10% or more", value: 10 },
    { label: "20% or more", value: 20 },
    { label: "30% or more", value: 30 },
    { label: "50% or more", value: 50 },
  ]

  const pricePresets = [
    { label: "Under \u20b11,000", min: 0, max: 1000 },
    { label: "\u20b11,000 - \u20b15,000", min: 1000, max: 5000 },
    { label: "\u20b15,000 - \u20b110,000", min: 5000, max: 10000 },
    { label: "Over \u20b110,000", min: 10000, max: 999999 },
  ]

  const pvPresets = [
    { label: "Under 500 PV", min: 0, max: 500 },
    { label: "500 - 1000 PV", min: 500, max: 1000 },
    { label: "1000 - 2000 PV", min: 1000, max: 2000 },
    { label: "Over 2000 PV", min: 2000, max: 5000 },
  ]

  // Keep maxPrice in sync with parent-provided maxPrice for initial empty states only.
  useEffect(() => {
    setPriceRange((previous) => {
      // Do not override user-entered values.
      // Only seed the range when max is empty/invalid.
      if (!Number.isFinite(previous[1]) || previous[1] <= 0) {
        return [0, maxPrice]
      }
      return previous
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxPrice])

  const handlePriceChange = (min: number, max: number) => {
    const newRange: [number, number] = [min, max]
    setPriceRange(newRange)
    onFilterChange({
      priceRange: newRange,
      sortBy,
      inStock: inStockOnly,
      discountOnly,
      minDiscount,
      pvRange,
      search: propSearch,
      hasPvOnly,
      brand: selectedBrand,
    })
  }

  const handleSortChange = (newSort: "default" | "asc" | "desc") => {
    setSortBy(newSort)
    onFilterChange({
      priceRange,
      sortBy: newSort,
      inStock: inStockOnly,
      discountOnly,
      minDiscount,
      pvRange,
      search: propSearch,
      hasPvOnly,
      brand: selectedBrand,
    })
  }

  const handleInStockToggle = () => {
    const newInStock = !inStockOnly
    setInStockOnly(newInStock)
    onFilterChange({
      priceRange,
      sortBy,
      inStock: newInStock,
      discountOnly,
      minDiscount,
      pvRange,
      search: propSearch,
      hasPvOnly,
      brand: selectedBrand,
    })
  }

  const handleDiscountToggle = () => {
    const newDiscountOnly = !discountOnly
    setDiscountOnly(newDiscountOnly)
    // Reset minDiscount to 0 when unchecking discountOnly
    const newMinDiscount = newDiscountOnly ? minDiscount : 0
    if (!newDiscountOnly) {
      setMinDiscount(newMinDiscount)
    }
    onFilterChange({
      priceRange,
      sortBy,
      inStock: inStockOnly,
      discountOnly: newDiscountOnly,
      minDiscount: newMinDiscount,
      pvRange,
      search: propSearch,
      hasPvOnly,
      brand: selectedBrand,
    })
  }

  const handleDiscountPercentageChange = (percentage: number) => {
    setMinDiscount(percentage)
    onFilterChange({
      priceRange,
      sortBy,
      inStock: inStockOnly,
      discountOnly,
      minDiscount: percentage,
      pvRange,
      search: propSearch,
      hasPvOnly,
      brand: selectedBrand,
    })
  }

  const handleRangeInputChange = (type: "min" | "max", value: number) => {
    const newMin = type === "min" ? value : priceRange[0]
    const newMax = type === "max" ? value : priceRange[1]

    // keep non-negative, but allow manual max values above the current catalog max
    const clampedMin = Math.max(0, newMin)
    const clampedMax = Math.max(0, newMax)

    if (clampedMin <= clampedMax) {
      handlePriceChange(clampedMin, clampedMax)
    }
  }

  const handlePresetClick = (preset: { min: number; max: number }) => {
    setPriceRange([preset.min, preset.max])
    onFilterChange({
      priceRange: [preset.min, preset.max],
      sortBy,
      inStock: inStockOnly,
      discountOnly,
      minDiscount,
      pvRange,
      search: propSearch,
      hasPvOnly,
      brand: selectedBrand,
    })
  }

  const handlePvRangeChange = (min: number, max: number) => {
    const newRange: [number, number] = [min, max]
    setPvRange(newRange)
    onFilterChange({
      priceRange,
      sortBy,
      inStock: inStockOnly,
      discountOnly,
      minDiscount,
      pvRange: newRange,
      search: propSearch,
      hasPvOnly,
      brand: selectedBrand,
    })
  }

  const handlePvRangeInputChange = (type: "min" | "max", value: number) => {
    const newMin = type === "min" ? value : pvRange[0]
    const newMax = type === "max" ? value : pvRange[1]

    if (newMin <= newMax) {
      handlePvRangeChange(newMin, newMax)
    }
  }

  const handlePvPresetClick = (preset: { min: number; max: number }) => {
    setPvRange([preset.min, preset.max])
    onFilterChange({
      priceRange,
      sortBy,
      inStock: inStockOnly,
      discountOnly,
      minDiscount,
      pvRange: [preset.min, preset.max],
      search: propSearch,
      hasPvOnly,
      brand: selectedBrand,
    })
  }

  const handleHasPvOnlyToggle = () => {
    const newHasPvOnly = !hasPvOnly
    setHasPvOnly(newHasPvOnly)
    // Reset pvRange to default when unchecking hasPvOnly
    const newPvRange: [number, number] = newHasPvOnly ? pvRange : [0, 5000]
    if (!newHasPvOnly) {
      setPvRange(newPvRange)
    }
    onFilterChange({
      priceRange,
      sortBy,
      inStock: inStockOnly,
      discountOnly,
      minDiscount,
      pvRange: newPvRange,
      search: propSearch,
      hasPvOnly: newHasPvOnly,
      brand: selectedBrand,
    })
  }

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-3 sm:p-6 dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      <h3 className="mb-4 text-base font-bold text-gray-900 sm:mb-6 sm:text-lg dark:text-white">
        Filters
      </h3>

      {/* Category Filter for Category Page Only - Only show when categories exist and not room page */}
      {!isRoomPage && categories && categories.length > 0 && (
        <div className="mb-4 sm:mb-6">
          <h4 className="mb-2 text-xs font-semibold text-gray-900 sm:mb-3 sm:text-sm dark:text-gray-100">
            Shop Category
          </h4>
          <div className="flex flex-col gap-0.5">
            {partnerSlugFromPath && (
              <button
                onClick={() => {
                  router.push(getPartnerHomePath())
                }}
                className="flex w-full cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-gray-600 transition-colors hover:bg-sky-50 hover:text-sky-600 sm:text-sm dark:text-gray-300 dark:hover:bg-sky-900/20 dark:hover:text-sky-400"
              >
                Home
              </button>
            )}
            <button
              onClick={() => {
                if (onCategorySelect) onCategorySelect(null)
                else router.push(getAllCategoryPath())
              }}
              className={`flex w-full cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors sm:text-sm ${
                hasAllCategorySelected && !propSearch
                  ? "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                  : "text-gray-600 hover:bg-sky-50 hover:text-sky-600 dark:text-gray-300 dark:hover:bg-sky-900/20 dark:hover:text-sky-400"
              }`}
            >
              All Category
            </button>
            {parentCategories.map((category) => {
              const children = childrenByParentId[category.id] ?? []
              const hasChildren = children.length > 0
              const isExpanded =
                expandedId === category.id ||
                currentParentId === category.id ||
                (currentCategory === category.name && hasChildren)
              const isSelected =
                currentCategory === category.name ||
                propSearch === category.name ||
                currentParentId === category.id
              return (
                <Fragment key={category.id}>
                  <button
                    onClick={() => {
                      if (hasChildren) {
                        setExpandedId((prev) =>
                          prev === category.id ? null : category.id
                        )
                        // Don't navigate when toggling a parent — state would reset
                        return
                      }
                      if (onCategorySelect) onCategorySelect(category)
                      else router.push(getCategoryPath(category))
                    }}
                    className={`flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors sm:text-sm ${
                      isSelected
                        ? "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                        : "text-gray-600 hover:bg-sky-50 hover:text-sky-600 dark:text-gray-300 dark:hover:bg-sky-900/20 dark:hover:text-sky-400"
                    }`}
                  >
                    {hasChildren && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className={`shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    )}
                    {category.name}
                  </button>
                  {isExpanded && hasChildren && (
                    <div className="ml-3 flex flex-col border-l-2 border-sky-200 dark:border-sky-700">
                      {/* "All [parent]" navigates to the parent category page */}
                      <div className="flex items-center">
                        <div className="h-px w-3 shrink-0 bg-sky-200 dark:bg-sky-700" />
                        <button
                          onClick={() => {
                            if (onCategorySelect) onCategorySelect(category)
                            else router.push(getCategoryPath(category))
                          }}
                          className={`my-0.5 flex flex-1 cursor-pointer items-center rounded-lg px-2 py-1 text-left text-xs font-medium transition-colors ${
                            currentCategory === category.name
                              ? "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                              : "text-gray-500 hover:bg-sky-50 hover:text-sky-500 dark:text-gray-400 dark:hover:bg-sky-900/20 dark:hover:text-sky-400"
                          }`}
                        >
                          All {category.name}
                        </button>
                      </div>
                      {children.map((child) => {
                        const isChildSelected =
                          currentCategory === child.name ||
                          propSearch === child.name
                        return (
                          <div key={child.id} className="flex items-center">
                            <div className="h-px w-3 shrink-0 bg-sky-200 dark:bg-sky-700" />
                            <button
                              onClick={() => {
                                if (onCategorySelect) onCategorySelect(child)
                                else router.push(getCategoryPath(child))
                              }}
                              className={`my-0.5 flex flex-1 cursor-pointer items-center rounded-lg px-2 py-1 text-left text-xs font-medium transition-colors ${
                                isChildSelected
                                  ? "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                                  : "text-gray-500 hover:bg-sky-50 hover:text-sky-500 dark:text-gray-400 dark:hover:bg-sky-900/20 dark:hover:text-sky-400"
                              }`}
                            >
                              {child.name}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Fragment>
              )
            })}
          </div>
        </div>
      )}

      {/* Room Filter for Room Page Only - Only show when isRoomPage is true */}
      {isRoomPage && (
        <div className="mb-4 sm:mb-6">
          <h4 className="mb-2 text-xs font-semibold text-gray-900 sm:mb-3 sm:text-sm dark:text-gray-100">
            Shop By Room
          </h4>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <button
              onClick={() => {
                router.push("/by-room")
              }}
              className={`cursor-pointer rounded-full px-2 py-1 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                !currentRoom
                  ? "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                  : "bg-gray-100 text-gray-600 hover:bg-sky-100 hover:text-sky-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-sky-900/30 dark:hover:text-sky-400"
              }`}
            >
              All Room
            </button>
            {ROOM_OPTIONS.map((room) => (
              <button
                key={room.id}
                onClick={() => {
                  const roomUrl = `/by-room/${room.slug}`
                  router.push(roomUrl)
                }}
                className={`cursor-pointer rounded-full px-2 py-1 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                  currentRoom === room.slug
                    ? "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                    : "bg-gray-100 text-gray-600 hover:bg-sky-100 hover:text-sky-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-sky-900/30 dark:hover:text-sky-400"
                }`}
              >
                {room.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Brand Filter for Category/Product Pages */}
      {!isBrandPage && brands && brands.length > 0 && (
        <div className="mb-4 sm:mb-6">
          <h4 className="mb-2 text-xs font-semibold text-gray-900 sm:mb-3 sm:text-sm dark:text-gray-100">
            Shop By Brand
          </h4>
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search brands..."
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-sky-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>
          {(() => {
            const filteredBrands = brands.filter((brand) =>
              brand.name.toLowerCase().includes(brandSearch.toLowerCase())
            )

            const emitBrandChange = (brandName: string) => {
              setSelectedBrand(brandName)
              onFilterChange({
                priceRange,
                sortBy,
                inStock: inStockOnly,
                discountOnly,
                minDiscount,
                pvRange,
                search: propSearch,
                hasPvOnly,
                brand: brandName,
              })
            }

            return (
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <button
                  onClick={() => emitBrandChange("")}
                  className={`cursor-pointer rounded-full px-2 py-1 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                    !selectedBrand
                      ? "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                      : "bg-gray-100 text-gray-600 hover:bg-sky-100 hover:text-sky-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-sky-900/30 dark:hover:text-sky-400"
                  }`}
                >
                  All Brands
                </button>
                {filteredBrands
                  .slice(0, showAllBrands ? filteredBrands.length : 6)
                  .map((brand) => (
                    <button
                      key={brand.id}
                      onClick={() => emitBrandChange(brand.name)}
                      className={`cursor-pointer rounded-full px-2 py-1 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                        selectedBrand === brand.name
                          ? "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                          : "bg-gray-100 text-gray-600 hover:bg-sky-100 hover:text-sky-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-sky-900/30 dark:hover:text-sky-400"
                      }`}
                    >
                      {brand.name}
                    </button>
                  ))}
                {filteredBrands.length > 6 && (
                  <button
                    onClick={() => setShowAllBrands(!showAllBrands)}
                    className="cursor-pointer rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-sky-100 hover:text-sky-600 sm:px-3 sm:text-sm dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-sky-900/30 dark:hover:text-sky-400"
                  >
                    {showAllBrands
                      ? "Show Less"
                      : `Show More (+${filteredBrands.length - 6})`}
                  </button>
                )}
                {filteredBrands.length === 0 && (
                  <p className="w-full py-2 text-xs text-gray-500 sm:text-sm dark:text-gray-400">
                    No brands found
                  </p>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Brand Filter for Brand Page Only */}
      {isBrandPage && brands && brands.length > 0 && (
        <div className="mb-4 sm:mb-6">
          <h4 className="mb-2 text-xs font-semibold text-gray-900 sm:mb-3 sm:text-sm dark:text-gray-100">
            Shop By Brand
          </h4>

          {/* Brand Search */}
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search brands..."
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-sky-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>

          {(() => {
            const filteredBrands = brands.filter((b) =>
              b.name.toLowerCase().includes(brandSearch.toLowerCase())
            )

            return (
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <button
                  onClick={() => {
                    router.push("/by-brand")
                  }}
                  className={`cursor-pointer rounded-full px-2 py-1 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                    !currentBrand
                      ? "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                      : "bg-gray-100 text-gray-600 hover:bg-sky-100 hover:text-sky-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-sky-900/30 dark:hover:text-sky-400"
                  }`}
                >
                  All Brands
                </button>
                {filteredBrands
                  .slice(0, showAllBrands ? filteredBrands.length : 8)
                  .map((brand) => (
                    <button
                      key={brand.id}
                      onClick={() => {
                        const brandSlug = toSlug(brand.name)
                        router.push(
                          `/by-brand?brand=${encodeURIComponent(brandSlug)}`
                        )
                      }}
                      className={`cursor-pointer rounded-full px-2 py-1 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                        currentBrand === brand.name
                          ? "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                          : "bg-gray-100 text-gray-600 hover:bg-sky-100 hover:text-sky-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-sky-900/30 dark:hover:text-sky-400"
                      }`}
                    >
                      {brand.name}
                    </button>
                  ))}
                {filteredBrands.length > 8 && (
                  <button
                    onClick={() => setShowAllBrands(!showAllBrands)}
                    className="cursor-pointer rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-sky-100 hover:text-sky-600 sm:px-3 sm:text-sm dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-sky-900/30 dark:hover:text-sky-400"
                  >
                    {showAllBrands
                      ? "See Less"
                      : `See More (+${filteredBrands.length - 8})`}
                  </button>
                )}
                {filteredBrands.length === 0 && (
                  <p className="w-full py-2 text-xs text-gray-500 sm:text-sm dark:text-gray-400">
                    No brands found
                  </p>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Price Range Filter */}
      <div className="mb-4 sm:mb-6">
        <h4 className="mb-2 text-xs font-semibold text-gray-900 sm:mb-3 sm:text-sm dark:text-gray-100">
          Price Range
        </h4>

        {/* Custom Range Inputs */}
        <div className="mb-3 flex items-center gap-2 sm:mb-4 sm:gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-[10px] text-gray-500 sm:text-xs dark:text-gray-400">
              Min
            </label>
            <input
              type="number"
              value={priceRange[0] || ""}
              onChange={(e) =>
                handleRangeInputChange("min", Number(e.target.value))
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 focus:ring-2 focus:ring-sky-500 focus:outline-none sm:px-3 sm:py-2 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              placeholder="0"
            />
          </div>
          <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
          <div className="flex-1">
            <label className="mb-1 block text-[10px] text-gray-500 sm:text-xs dark:text-gray-400">
              Max
            </label>
            <input
              type="number"
              value={priceRange[1] || ""}
              onChange={(e) =>
                handleRangeInputChange("max", Number(e.target.value))
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 focus:ring-2 focus:ring-sky-500 focus:outline-none sm:px-3 sm:py-2 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              placeholder="10000"
            />
          </div>
        </div>

        {/* Price Presets */}
        <div className="space-y-1.5 sm:space-y-2">
          {pricePresets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handlePresetClick(preset)}
              className={`w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors sm:px-3 sm:py-2 sm:text-sm ${
                priceRange[0] === preset.min && priceRange[1] === preset.max
                  ? "bg-sky-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-sky-100 hover:text-sky-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-sky-500/20 dark:hover:text-sky-400"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort Filter */}
      <div className="mb-4 sm:mb-6">
        <h4 className="mb-2 text-xs font-semibold text-gray-900 sm:mb-3 sm:text-sm dark:text-gray-100">
          Sort By Name
        </h4>
        <div className="space-y-1.5 sm:space-y-2">
          <button
            onClick={() => handleSortChange("default")}
            className={`w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors sm:px-3 sm:py-2 sm:text-sm ${
              sortBy === "default"
                ? "bg-sky-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-sky-100 hover:text-sky-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-sky-500/20 dark:hover:text-sky-400"
            }`}
          >
            Default
          </button>
          <button
            onClick={() => handleSortChange("asc")}
            className={`w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors sm:px-3 sm:py-2 sm:text-sm ${
              sortBy === "asc"
                ? "bg-sky-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-sky-100 hover:text-sky-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-sky-500/20 dark:hover:text-sky-400"
            }`}
          >
            A to Z
          </button>
          <button
            onClick={() => handleSortChange("desc")}
            className={`w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors sm:px-3 sm:py-2 sm:text-sm ${
              sortBy === "desc"
                ? "bg-sky-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-sky-100 hover:text-sky-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-sky-500/20 dark:hover:text-sky-400"
            }`}
          >
            Z to A
          </button>
        </div>
      </div>

      {/* Discount Filter */}
      <div className="mb-4 sm:mb-6">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={discountOnly}
            onChange={handleDiscountToggle}
            className="h-3.5 w-3.5 rounded border-gray-300 bg-white text-sky-500 focus:ring-sky-500 sm:h-4 sm:w-4 dark:border-gray-600 dark:bg-gray-700"
          />
          <span className="text-xs text-gray-700 sm:text-sm dark:text-gray-300">
            Discounted Items Only
          </span>
        </label>
      </div>

      {/* Discount Percentage Filter */}
      {discountOnly && (
        <div className="mb-4 sm:mb-6">
          <h4 className="mb-2 text-xs font-semibold text-gray-900 sm:mb-3 sm:text-sm dark:text-gray-100">
            Min Discount %
          </h4>
          <div className="space-y-1.5 sm:space-y-2">
            {discountPresets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handleDiscountPercentageChange(preset.value)}
                className={`w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors sm:px-3 sm:py-2 sm:text-sm ${
                  minDiscount === preset.value
                    ? "bg-sky-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-sky-100 hover:text-sky-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-sky-500/20 dark:hover:text-sky-400"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Performance Value Filter */}
      <div className="mb-4 sm:mb-6">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={hasPvOnly}
            onChange={handleHasPvOnlyToggle}
            className="h-3.5 w-3.5 rounded border-gray-300 bg-white text-sky-500 focus:ring-sky-500 sm:h-4 sm:w-4 dark:border-gray-600 dark:bg-gray-700"
          />
          <span className="text-xs text-gray-700 sm:text-sm dark:text-gray-300">
            Has Performance Value
          </span>
          <div className="group relative flex items-center">
            <button
              type="button"
              className="flex cursor-pointer items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              onMouseEnter={() => setShowPvInfo(true)}
              onMouseLeave={() => setShowPvInfo(false)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="sm:h-4 sm:w-4"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </button>
            {showPvInfo && (
              <div className="absolute bottom-full left-0 z-10 mb-1 w-40 rounded-lg bg-gray-900 p-1.5 text-[10px] text-white sm:mb-2 sm:w-56 sm:p-2 sm:text-xs dark:bg-gray-700">
                <p>
                  PV (Performance Value) represents the earning points you get
                  when you purchase a product. Higher PV means more value
                  earned.
                </p>
              </div>
            )}
          </div>
        </label>
      </div>

      {/* PV Range Sub-filter */}
      {hasPvOnly && (
        <div className="mb-4 sm:mb-6">
          <h4 className="mb-2 text-xs font-semibold text-gray-900 sm:mb-3 sm:text-sm dark:text-gray-100">
            Min Performance Value
          </h4>
          <div className="space-y-1.5 sm:space-y-2">
            {pvPresets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePvPresetClick(preset)}
                className={`w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors sm:px-3 sm:py-2 sm:text-sm ${
                  pvRange[0] === preset.min && pvRange[1] === preset.max
                    ? "bg-sky-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-sky-100 hover:text-sky-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-sky-500/20 dark:hover:text-sky-400"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stock Filter */}
      <div className="mb-4 sm:mb-6">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={handleInStockToggle}
            className="h-3.5 w-3.5 rounded border-gray-300 bg-white text-sky-500 focus:ring-sky-500 sm:h-4 sm:w-4 dark:border-gray-600 dark:bg-gray-700"
          />
          <span className="text-xs text-gray-700 sm:text-sm dark:text-gray-300">
            In Stock Only
          </span>
        </label>
      </div>

      {/* Clear Filters Button */}
      <button
        onClick={() => {
          setPriceRange([0, maxPrice])
          setSortBy("default")
          setInStockOnly(false)
          setDiscountOnly(false)
          setMinDiscount(0)
          setPvRange(propPvRange)
          setHasPvOnly(false)
          setSelectedBrand("")
          onFilterChange({
            priceRange: [0, maxPrice],
            sortBy: "default",
            inStock: false,
            discountOnly: false,
            minDiscount: 0,
            pvRange: propPvRange,
            search: propSearch,
            hasPvOnly: false,
            brand: "",
          })
        }}
        className="w-full cursor-pointer rounded-lg bg-sky-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-600 dark:hover:bg-sky-600"
      >
        Clear Filters
      </button>
    </div>
  )
}
