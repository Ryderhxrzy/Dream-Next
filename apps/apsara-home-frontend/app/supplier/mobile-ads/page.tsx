"use client"

import { useState, useEffect } from "react"
import { Loader } from "lucide-react"
import { useGetMyBrandsQuery } from "@/store/api/brandRequestsApi"
import type { HomeSection } from "@/store/api/supplierBrandHomeApi"
import MobilePhonePreview from "@/components/supplier/MobilePhonePreview"
import SectionEditor from "@/components/supplier/mobileHome/SectionEditor"

export default function MobileManagementHomePage() {
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null)
  const [previewSections, setPreviewSections] = useState<HomeSection[]>([])
  const { data: brandsData, isLoading: isBrandsLoading } = useGetMyBrandsQuery()
  const brands = brandsData?.brands || []

  const selectedBrand = brands.find((b) => b.id === selectedBrandId)

  useEffect(() => {
    if (brands.length > 0 && !selectedBrandId) {
      setSelectedBrandId(brands[0].id)
    }
  }, [brands, selectedBrandId])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Mobile Home Builder
        </h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Customize the layout of your brand&apos;s mobile home screen
        </p>
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
                onClick={() => setSelectedBrandId(brand.id)}
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

      {/* Builder + Preview */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Section builder (add + list) */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-slate-200/80 bg-white/50 p-6 dark:border-slate-700/50 dark:bg-white/[0.03]">
            {selectedBrandId ? (
              <SectionEditor
                key={selectedBrandId}
                brandId={selectedBrandId}
                onSectionsChange={setPreviewSections}
              />
            ) : (
              <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                Select a brand to start building.
              </p>
            )}
          </div>
        </div>

        {/* Right: Phone preview */}
        <div className="lg:col-span-1">
          <MobilePhonePreview
            brandName={selectedBrand?.name ?? "Your Brand"}
            brandImage={selectedBrand?.image ?? null}
            sections={previewSections}
          />
        </div>
      </div>
    </div>
  )
}
