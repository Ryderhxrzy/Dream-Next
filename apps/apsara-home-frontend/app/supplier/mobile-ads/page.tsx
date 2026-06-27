"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import {
  GalleryHorizontalEnd,
  Image as ImageIcon,
  LayoutTemplate,
  Loader,
  Pencil,
  Plus,
  ShoppingBag,
  Smartphone,
  X,
} from "lucide-react"
import { useGetMyBrandsQuery } from "@/store/api/brandRequestsApi"
import MobilePhonePreview from "@/components/supplier/MobilePhonePreview"

type SectionType = "banner" | "carousel" | "products"
type ModalTab = "sections" | "preview"

const SECTION_OPTIONS: {
  type: SectionType
  label: string
  description: string
  icon: typeof ImageIcon
}[] = [
  {
    type: "banner",
    label: "Banner",
    description: "A single full-width promotional image.",
    icon: ImageIcon,
  },
  {
    type: "carousel",
    label: "Carousel",
    description: "Multiple sliding banners customers can swipe.",
    icon: GalleryHorizontalEnd,
  },
  {
    type: "products",
    label: "Section with Products",
    description: "A titled section showing a row of your products.",
    icon: ShoppingBag,
  },
]

export default function MobileManagementHomePage() {
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [activeTab, setActiveTab] = useState<ModalTab>("sections")
  const { data: brandsData, isLoading: isBrandsLoading } = useGetMyBrandsQuery()
  const brands = brandsData?.brands || []

  const selectedBrand = brands.find((b) => b.id === selectedBrandId)

  useEffect(() => {
    if (brands.length > 0 && !selectedBrandId) {
      setSelectedBrandId(brands[0].id)
    }
  }, [brands, selectedBrandId])

  useEffect(() => {
    if (showEditModal) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [showEditModal])

  const handleAddSectionType = (type: SectionType) => {
    // TODO: implement section creation
    console.log("Add section:", type)
  }

  const TABS = [
    { key: "sections" as ModalTab, label: "Sections", icon: LayoutTemplate },
    { key: "preview" as ModalTab, label: "Preview", icon: Smartphone },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Mobile Home Builder
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Customize the layout of your brand&apos;s mobile home screen
          </p>
        </div>
        <button
          onClick={() => setShowEditModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700"
        >
          <Pencil className="h-4 w-4" />
          Edit
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
                onClick={() =>
                  setSelectedBrandId(selectedBrandId === brand.id ? null : brand.id)
                }
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

      {/* Sections + Preview */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Sections list */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-slate-200/80 bg-white/50 p-6 dark:border-slate-700/50 dark:bg-white/[0.03]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Sections
              </h2>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                0 sections
              </span>
            </div>

            <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 py-12 text-center dark:border-slate-700 dark:bg-slate-950/30">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No sections yet.{" "}
                <button
                  onClick={() => setShowEditModal(true)}
                  className="font-medium text-sky-500 hover:underline"
                >
                  Click Edit
                </button>{" "}
                to get started.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Phone preview */}
        <div className="lg:col-span-1">
          <MobilePhonePreview
            brandName={selectedBrand?.name ?? "Your Brand"}
            brandImage={selectedBrand?.image ?? null}
          />
        </div>
      </div>

      {/* Edit Modal — portaled to body */}
      {typeof window !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showEditModal && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowEditModal(false)}
                  className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.97, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: 12 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-700/50 dark:bg-slate-900 lg:inset-8"
                >
                  {/* Modal top bar */}
                  <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 px-6 py-4 dark:border-slate-700/50">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Edit Home Layout
                      </h3>
                      {selectedBrand && (
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                          {selectedBrand.name}
                        </p>
                      )}
                    </div>

                    {/* Tab switcher */}
                    <div className="flex items-center gap-1 rounded-lg border border-slate-200/80 bg-slate-100 p-1 dark:border-slate-700/50 dark:bg-slate-800">
                      {TABS.map((tab) => {
                        const Icon = tab.icon
                        return (
                          <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                              activeTab === tab.key
                                ? "bg-white text-sky-600 shadow-sm dark:bg-slate-700 dark:text-sky-400"
                                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                          </button>
                        )
                      })}
                    </div>

                    <button
                      onClick={() => setShowEditModal(false)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Modal body */}
                  <div className="min-h-0 flex-1 overflow-hidden">
                    <AnimatePresence mode="wait">
                      {activeTab === "sections" ? (
                        <motion.div
                          key="sections"
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          transition={{ duration: 0.15 }}
                          className="flex h-full flex-col overflow-y-auto p-6"
                        >
                          {/* Add section options */}
                          <h4 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Add to Home
                          </h4>
                          <div className="grid gap-3 sm:grid-cols-3">
                            {SECTION_OPTIONS.map((option) => {
                              const Icon = option.icon
                              return (
                                <button
                                  key={option.type}
                                  onClick={() => handleAddSectionType(option.type)}
                                  className="group flex flex-col items-center gap-3 rounded-xl border border-slate-200/80 p-5 text-center transition hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700/50 dark:hover:border-sky-500/40 dark:hover:bg-sky-500/10"
                                >
                                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-sky-100 group-hover:text-sky-600 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-sky-500/20 dark:group-hover:text-sky-400">
                                    <Icon className="h-6 w-6" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                      {option.label}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                      {option.description}
                                    </p>
                                  </div>
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-sky-500 px-3 py-1 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                                    <Plus className="h-3 w-3" />
                                    Add
                                  </span>
                                </button>
                              )
                            })}
                          </div>

                          {/* Current sections list */}
                          <div className="mt-8">
                            <div className="mb-3 flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Current Sections
                              </h4>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                0 sections
                              </span>
                            </div>
                            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-16 text-center dark:border-slate-700 dark:bg-slate-950/30">
                              <p className="text-sm text-slate-400 dark:text-slate-500">
                                No sections yet. Add one above.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="preview"
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 8 }}
                          transition={{ duration: 0.15 }}
                          className="flex h-full items-center justify-center overflow-y-auto p-6"
                        >
                          <MobilePhonePreview
                            brandName={selectedBrand?.name ?? "Your Brand"}
                            brandImage={selectedBrand?.image ?? null}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  )
}
