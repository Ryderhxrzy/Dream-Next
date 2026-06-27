"use client"

import { useState, useEffect } from "react"
import { Plus, Loader } from "lucide-react"
import { useGetMyBrandsQuery } from "@/store/api/brandRequestsApi"

export default function MobileManagementHomePage() {
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null)
  const { data: brandsData, isLoading: isBrandsLoading } = useGetMyBrandsQuery()
  const brands = brandsData?.brands || []

  // Auto-select first brand when brands load
  useEffect(() => {
    if (brands.length > 0 && !selectedBrandId) {
      setSelectedBrandId(brands[0].id)
    }
  }, [brands, selectedBrandId])

  const handleAddSection = () => {
    // TODO: Implement add section functionality
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Mobile Home Builder
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Drag to reorder sections on your mobile home screen
          </p>
        </div>
        <button
          onClick={handleAddSection}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" />
          Add Section
        </button>
      </div>

      {/* Brand Filter */}
      <div className="rounded-lg border border-slate-200/80 bg-white/50 p-4 dark:border-slate-700/50 dark:bg-white/[0.03]">
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          Select Brand
        </h2>

        {isBrandsLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader className="h-5 w-5 animate-spin text-sky-500" />
          </div>
        ) : brands.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No brands found. Create a brand first.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {brands.map((brand) => (
              <button
                key={brand.id}
                onClick={() => setSelectedBrandId(selectedBrandId === brand.id ? null : brand.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  selectedBrandId === brand.id
                    ? "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {brand.image && (
                  <div className="relative h-4 w-4 overflow-hidden rounded">
                    <img
                      src={brand.image}
                      alt={brand.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <span>{brand.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sections and Preview */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Sections List */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-slate-200/80 bg-white/50 p-6 dark:border-slate-700/50 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Sections
              </h2>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                0 sections
              </span>
            </div>

            <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 py-12 text-center dark:border-slate-700 dark:bg-slate-950/30">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No sections yet. Click "Add Section" to get started.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Phone Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <div className="rounded-lg border border-slate-200/80 bg-white/50 p-4 dark:border-slate-700/50 dark:bg-white/[0.03]">
              <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
                Preview
              </h2>

              {/* Phone Mockup */}
              <div className="flex justify-center">
                <div className="w-full max-w-xs">
                  {/* Phone Bezel */}
                  <div
                    className="relative overflow-hidden rounded-3xl bg-black shadow-2xl"
                    style={{
                      aspectRatio: "9/19.5",
                      boxShadow: "0 0 0 12px #1f2937, 0 0 0 13px #000",
                    }}
                  >
                    {/* Screen */}
                    <div className="relative h-full w-full bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                      {/* Status Bar */}
                      <div className="flex items-center justify-between bg-slate-950 px-4 py-1.5 text-white text-xs font-medium">
                        <span>9:41</span>
                        <div className="flex gap-0.5">
                          <span>📶</span>
                          <span>📡</span>
                          <span>🔋</span>
                        </div>
                      </div>

                      {/* Notch */}
                      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-32 h-5 bg-black rounded-b-3xl z-10" />

                      {/* Content Area */}
                      <div className="h-full w-full overflow-hidden pt-2 px-3 pb-3 flex flex-col">
                        {/* App Header */}
                        <div className="mb-2 rounded-lg bg-white/10 p-2 dark:bg-slate-700/30">
                          <p className="text-[9px] font-semibold text-slate-700 dark:text-slate-300">
                            {selectedBrandId
                              ? brands.find((b) => b.id === selectedBrandId)?.name
                              : "Your Brand"}
                          </p>
                        </div>

                        {/* Sections Preview */}
                        <div className="flex-1 space-y-1 overflow-hidden">
                          <div className="rounded bg-white/20 p-1.5 dark:bg-slate-600/30">
                            <p className="text-[8px] text-slate-600 dark:text-slate-400">
                              Section 1
                            </p>
                          </div>
                          <div className="rounded bg-white/20 p-1.5 dark:bg-slate-600/30">
                            <p className="text-[8px] text-slate-600 dark:text-slate-400">
                              Section 2
                            </p>
                          </div>
                          <div className="rounded bg-white/20 p-1.5 dark:bg-slate-600/30">
                            <p className="text-[8px] text-slate-600 dark:text-slate-400">
                              Section 3
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Home Indicator */}
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-24 h-0.5 bg-slate-700 rounded-full dark:bg-slate-600" />
                    </div>
                  </div>

                  {/* Phone Info */}
                  <div className="mt-4 rounded-lg bg-sky-50 p-3 text-center dark:bg-sky-500/10">
                    <p className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                      ✓ Mobile Preview
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
