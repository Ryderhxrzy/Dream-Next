"use client"

import { useEffect, useState } from "react"

interface TopFilterProps {
  onSearchChange?: (search: string) => void
  onViewTypeChange?: (viewType: "grid" | "list") => void
  onShowNumberChange?: (showNumber: number | "all") => void
  onSortChange?: (sort: string) => void
  onClearFilters?: () => void
  searchValue?: string
  viewType?: "grid" | "list"
  showNumber?: number | "all"
  sortValue?: string
  className?: string
  hasActiveFilters?: boolean
  showPageSizeControl?: boolean
}

const SHOW_NUMBER_OPTIONS = ["all", 12, 16, 24, 48, 96]
const SORT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
]

export default function TopFilter({
  onSearchChange,
  onViewTypeChange,
  onShowNumberChange,
  onSortChange,
  onClearFilters,
  searchValue = "",
  viewType = "grid",
  showNumber = 12,
  sortValue = "default",
  className = "",
  hasActiveFilters = false,
  showPageSizeControl = true,
}: TopFilterProps) {
  const [search, setSearch] = useState(searchValue)
  const [currentViewType, setCurrentViewType] = useState<"grid" | "list">(
    viewType
  )
  const [currentShowNumber, setCurrentShowNumber] = useState<number | "all">(
    showNumber
  )
  const [currentSort, setCurrentSort] = useState(sortValue)
  const [showGridTooltip, setShowGridTooltip] = useState(false)
  const [showListTooltip, setShowListTooltip] = useState(false)

  const handleSearchChange = (value: string) => {
    setSearch(value)
    onSearchChange?.(value)
  }

  const handleViewTypeChange = (type: "grid" | "list") => {
    setCurrentViewType(type)
    onViewTypeChange?.(type)
  }

  const handleShowNumberChange = (number: number | "all") => {
    setCurrentShowNumber(number)
    onShowNumberChange?.(number)
  }

  const handleSortChange = (sort: string) => {
    setCurrentSort(sort)
    onSortChange?.(sort)
  }

  // Sync internal state with props when they change
  useEffect(() => {
    setSearch(searchValue)
  }, [searchValue])

  useEffect(() => {
    setCurrentViewType(viewType)
  }, [viewType])

  useEffect(() => {
    setCurrentShowNumber(showNumber)
  }, [showNumber])

  useEffect(() => {
    setCurrentSort(sortValue)
  }, [sortValue])

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-2.5 sm:p-4 dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Search bar */}
        <div className="relative flex-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 sm:left-4 dark:text-gray-500"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pr-9 pl-9 text-sm text-gray-700 transition-all placeholder:text-gray-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-400/30 focus:outline-none sm:py-3 sm:pr-12 sm:pl-12 sm:text-base dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:bg-gray-600"
          />
          {search && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 sm:right-4 dark:text-gray-500 dark:hover:text-gray-400"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
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

        {/* Right side controls */}
        <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:gap-3">
          {/* Clear filters button */}
          <button
            onClick={() => onClearFilters?.()}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:py-2 sm:text-sm ${
              hasActiveFilters
                ? "cursor-pointer border-sky-200 bg-sky-50 text-sky-500 hover:bg-sky-100 hover:text-sky-600 dark:border-sky-900/30 dark:bg-sky-900/10 dark:text-sky-400 dark:hover:bg-sky-900/20 dark:hover:text-sky-300"
                : "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-600"
            }`}
            disabled={!hasActiveFilters}
            title={hasActiveFilters ? "Clear all filters" : "No active filters"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Clear
          </button>

          {/* Sort dropdown */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="hidden text-xs font-medium text-gray-600 sm:inline sm:text-sm dark:text-gray-400">
              Sort:
            </span>
            <select
              value={currentSort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 transition-all hover:border-sky-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 focus:outline-none sm:px-3 sm:py-2 sm:text-sm dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {showPageSizeControl && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="hidden text-xs font-medium text-gray-600 sm:inline sm:text-sm dark:text-gray-400">
                Show:
              </span>
              <select
                value={currentShowNumber}
                onChange={(e) =>
                  handleShowNumberChange(
                    e.target.value === "all" ? "all" : Number(e.target.value)
                  )
                }
                className="cursor-pointer rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 transition-all hover:border-sky-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 focus:outline-none sm:px-3 sm:py-2 sm:text-sm dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200"
              >
                {SHOW_NUMBER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* View toggle */}
          <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 sm:gap-1 sm:p-1 dark:bg-gray-700">
            <div className="relative">
              <button
                onClick={() => handleViewTypeChange("grid")}
                className={`cursor-pointer rounded-md p-1.5 transition-colors hover:scale-105 sm:p-2 ${
                  currentViewType === "grid"
                    ? "bg-white text-sky-500 shadow-sm dark:bg-gray-600"
                    : "text-gray-600 hover:text-sky-500 dark:text-gray-300 dark:hover:text-sky-400"
                }`}
                onMouseEnter={() => setShowGridTooltip(true)}
                onMouseLeave={() => setShowGridTooltip(false)}
                title="Grid View"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="sm:h-[18px] sm:w-[18px]"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </button>
              {showGridTooltip && (
                <div className="absolute top-full left-1/2 z-10 mt-2 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white dark:bg-gray-700">
                  Grid View
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => handleViewTypeChange("list")}
                className={`cursor-pointer rounded-md p-1.5 transition-colors hover:scale-105 sm:p-2 ${
                  currentViewType === "list"
                    ? "bg-white text-sky-500 shadow-sm dark:bg-gray-600"
                    : "text-gray-600 hover:text-sky-500 dark:text-gray-300 dark:hover:text-sky-400"
                }`}
                onMouseEnter={() => setShowListTooltip(true)}
                onMouseLeave={() => setShowListTooltip(false)}
                title="List View"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="sm:h-[18px] sm:w-[18px]"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="3" y1="15" x2="21" y2="15" />
                </svg>
              </button>
              {showListTooltip && (
                <div className="absolute top-full left-1/2 z-10 mt-2 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white dark:bg-gray-700">
                  List View
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
