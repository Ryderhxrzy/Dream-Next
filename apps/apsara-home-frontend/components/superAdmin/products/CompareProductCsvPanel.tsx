"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { showErrorToast, showSuccessToast } from "@/libs/toast"
import { useGetCategoriesQuery } from "@/store/api/categoriesApi"
import { useGetProductBrandsQuery } from "@/store/api/productBrandsApi"
import {
  BulkImportProductsRow,
  CreateProductVariantPayload,
  Product,
  ProductVariant,
  useLazyGetProductsQuery,
  useUpdateProductVariantMutation,
} from "@/store/api/productsApi"
import {
  compareField,
  groupVariantRows,
  normalizeLookupValue,
  normalizeRoomType,
  parseCsvText,
  parseImageList,
} from "./BulkProductImportPanel"

interface CompareProductCsvPanelProps {
  onClose: () => void
}

// Fields compared between the uploaded CSV row and the live product. Mirrors
// the unchanged-detection logic in BulkProductImportPanel (isProductRowUnchanged)
// so the comparison here matches what an actual import would treat as a change.
const COMPARE_FIELDS: Array<{
  label: string
  csvKey: keyof BulkImportProductsRow
  get: (product: Product) => unknown
  numeric?: boolean
}> = [
  { label: "Name", csvKey: "pd_name", get: (p) => p.name },
  { label: "Category", csvKey: "pd_catid", get: (p) => p.catid, numeric: true },
  {
    label: "SRP Price",
    csvKey: "pd_price_srp",
    get: (p) => p.priceSrp,
    numeric: true,
  },
  {
    label: "DP Price",
    csvKey: "pd_price_dp",
    get: (p) => p.priceDp,
    numeric: true,
  },
  {
    label: "Member Price",
    csvKey: "pd_price_member",
    get: (p) => p.priceMember,
    numeric: true,
  },
  {
    label: "Product PV",
    csvKey: "pd_prodpv",
    get: (p) => p.prodpv,
    numeric: true,
  },
  { label: "Quantity", csvKey: "pd_qty", get: (p) => p.qty, numeric: true },
  { label: "Weight", csvKey: "pd_weight", get: (p) => p.weight, numeric: true },
  {
    label: "Room Type",
    csvKey: "pd_room_type",
    get: (p) => p.roomType,
    numeric: true,
  },
  {
    label: "Brand",
    csvKey: "pd_brand_type",
    get: (p) => p.brandType,
    numeric: true,
  },
  { label: "Status", csvKey: "pd_status", get: (p) => p.status, numeric: true },
  { label: "Type", csvKey: "pd_type", get: (p) => p.type, numeric: true },
  {
    label: "Must Have",
    csvKey: "pd_musthave",
    get: (p) => (p.musthave ? 1 : 0),
    numeric: true,
  },
  {
    label: "Best Seller",
    csvKey: "pd_bestseller",
    get: (p) => (p.bestseller ? 1 : 0),
    numeric: true,
  },
  {
    label: "Sales Promo",
    csvKey: "pd_salespromo",
    get: (p) => (p.salespromo ? 1 : 0),
    numeric: true,
  },
  {
    label: "Assembly Required",
    csvKey: "pd_assembly_required",
    get: (p) => (p.assemblyRequired ? 1 : 0),
    numeric: true,
  },
  {
    label: "Verified",
    csvKey: "pd_verified",
    get: (p) => (p.verified ? 1 : 0),
    numeric: true,
  },
  { label: "Material", csvKey: "pd_material", get: (p) => p.material },
  { label: "Warranty", csvKey: "pd_warranty", get: (p) => p.warranty },
]

// Per-variant fields compared between a CSV variant row and a live variant.
// `zeroIsBlank` covers physical dimensions where the CSV parser fills a blank
// cell with 0 — those should read as "not provided", not a change to 0.
const VARIANT_COMPARE_FIELDS: Array<{
  label: string
  csvKey: keyof CreateProductVariantPayload
  get: (variant: ProductVariant) => unknown
  numeric?: boolean
  zeroIsBlank?: boolean
  // Only these may be applied to the live DB from the compare view.
  fixable?: boolean
}> = [
  { label: "Name", csvKey: "pv_name", get: (v) => v.name, fixable: true },
  { label: "Color", csvKey: "pv_color", get: (v) => v.color, fixable: true },
  {
    label: "Color Hex",
    csvKey: "pv_color_hex",
    get: (v) => v.colorHex,
    fixable: true,
  },
  { label: "Size", csvKey: "pv_size", get: (v) => v.size },
  { label: "Style", csvKey: "pv_style", get: (v) => v.style },
  {
    label: "Width",
    csvKey: "pv_width",
    get: (v) => v.width,
    numeric: true,
    zeroIsBlank: true,
  },
  {
    label: "Dimension",
    csvKey: "pv_dimension",
    get: (v) => v.dimension,
    numeric: true,
    zeroIsBlank: true,
  },
  {
    label: "Height",
    csvKey: "pv_height",
    get: (v) => v.height,
    numeric: true,
    zeroIsBlank: true,
  },
  {
    label: "SRP Price",
    csvKey: "pv_price_srp",
    get: (v) => v.priceSrp,
    numeric: true,
  },
  {
    label: "DP Price",
    csvKey: "pv_price_dp",
    get: (v) => v.priceDp,
    numeric: true,
  },
  {
    label: "Member Price",
    csvKey: "pv_price_member",
    get: (v) => v.priceMember,
    numeric: true,
  },
  {
    label: "Variant PV",
    csvKey: "pv_prodpv",
    get: (v) => v.prodpv,
    numeric: true,
  },
  { label: "Quantity", csvKey: "pv_qty", get: (v) => v.qty, numeric: true },
  { label: "Status", csvKey: "pv_status", get: (v) => v.status, numeric: true },
]

type FieldChange = {
  label: string
  csvValue: string
  dbValue: string
  // Present only for fixable variant fields (color, hex, name). Holds the
  // backend field name + the Google Sheet value to push to the live DB.
  fix?: { field: keyof CreateProductVariantPayload; value: string }
}

type VariantDiff = {
  sku: string
  name: string
  status: "changed" | "new"
  changes: FieldChange[]
  productId: number
  variantId?: number
}

type ComparisonRow = {
  index: number
  name: string
  sku: string
  status: "changed" | "unchanged" | "new"
  changes: FieldChange[]
  variantDiffs: VariantDiff[]
  changeCount: number
  productId?: number
}

const displayValue = (value: unknown): string => {
  if (value === undefined || value === null) return "—"
  const str = String(value).trim()
  return str === "" ? "—" : str
}

// Normalized key for SKU matching — tolerant of casing and surrounding spaces.
const skuKey = (value: unknown): string => String(value ?? "").trim().toLowerCase()

const normalizeImages = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((url) => String(url).trim())
    .filter(Boolean)
}

// Order-independent comparison of image URL lists.
const imagesEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((url, i) => url === sortedB[i])
}

// Compares a product's CSV variants against its live variants (matched by SKU).
const diffVariants = (
  csvVariants: CreateProductVariantPayload[],
  dbVariants: ProductVariant[],
  productId: number
): VariantDiff[] => {
  const dbBySku = new Map(
    dbVariants
      .filter((v) => v.sku)
      .map((v) => [skuKey(v.sku), v])
  )

  const diffs: VariantDiff[] = []
  for (const csvVariant of csvVariants) {
    const sku = String(csvVariant.pv_sku ?? "").trim()
    if (!sku) continue
    const name = String(csvVariant.pv_name ?? "").trim() || sku
    const existing = dbBySku.get(skuKey(sku))

    if (!existing) {
      diffs.push({ sku, name, status: "new", changes: [], productId })
      continue
    }

    const changes: FieldChange[] = []
    for (const field of VARIANT_COMPARE_FIELDS) {
      let csvVal = csvVariant[field.csvKey]
      if (field.zeroIsBlank && (csvVal === 0 || csvVal === "0")) csvVal = ""
      if (!compareField(csvVal, field.get(existing), field.numeric)) {
        changes.push({
          label: field.label,
          csvValue: displayValue(csvVal),
          dbValue: displayValue(field.get(existing)),
          fix: field.fixable
            ? {
                field: field.csvKey,
                value: String(csvVal ?? "").trim(),
              }
            : undefined,
        })
      }
    }

    // Images: blank/empty in CSV means "not provided" — only flag a real change.
    const csvImages = normalizeImages(csvVariant.pv_images)
    const dbImages = normalizeImages(existing.images)
    if (csvImages.length > 0 && !imagesEqual(csvImages, dbImages)) {
      changes.push({
        label: "Images",
        csvValue: `${csvImages.length} image(s): ${csvImages.join(" | ")}`,
        dbValue: dbImages.length
          ? `${dbImages.length} image(s): ${dbImages.join(" | ")}`
          : "—",
      })
    }

    if (changes.length > 0) {
      diffs.push({
        sku,
        name,
        status: "changed",
        changes,
        productId,
        variantId: existing.id,
      })
    }
  }

  return diffs
}

export default function CompareProductCsvPanel({
  onClose,
}: CompareProductCsvPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [importSource, setImportSource] = useState<"file" | "link">("file")
  const [sheetUrl, setSheetUrl] = useState("")
  const [isFetchingSheet, setIsFetchingSheet] = useState(false)
  const [fileName, setFileName] = useState("")
  const [csvText, setCsvText] = useState("")
  const [fileError, setFileError] = useState("")
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [statusFilter, setStatusFilter] = useState<
    "all" | "changed" | "unchanged" | "new"
  >("all")
  // Keys of variant fields currently being pushed to the live DB.
  const [fixingKeys, setFixingKeys] = useState<Set<string>>(new Set())

  const { data: categoryData } = useGetCategoriesQuery({ per_page: 500 })
  const { data: brandData } = useGetProductBrandsQuery({ search: "" })
  const [fetchProducts, { data: existingProductsData, isFetching }] =
    useLazyGetProductsQuery()
  const [updateProductVariant] = useUpdateProductVariantMutation()

  const categoryLookup = useMemo(
    () => categoryData?.categories ?? [],
    [categoryData]
  )
  const brandLookup = useMemo(() => brandData?.brands ?? [], [brandData])
  const existingProducts = useMemo(
    () => existingProductsData?.products ?? [],
    [existingProductsData]
  )
  // True once the products request has returned at least once. Avoids briefly
  // flagging everything as "Not in DB" while the live list is still loading.
  const hasLoadedProducts = existingProductsData !== undefined

  // Parse + group the uploaded CSV into product rows.
  const parsedResult = useMemo<
    | { rows: BulkImportProductsRow[]; error?: undefined }
    | { rows?: undefined; error: string }
    | null
  >(() => {
    if (!csvText.trim()) return null
    try {
      const result = parseCsvText(csvText)
      return { rows: groupVariantRows(result.rows) }
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "Failed to parse CSV file.",
      }
    }
  }, [csvText])

  const parsed = useMemo(
    () =>
      parsedResult && parsedResult.rows ? { rows: parsedResult.rows } : null,
    [parsedResult]
  )
  const parseError = parsedResult?.error ?? ""

  // Normalize CSV cell values (category/brand names -> ids, room type) so the
  // comparison lines up with the numeric ids stored on live products.
  const normalizedRows = useMemo(() => {
    if (!parsed) return null
    return parsed.rows.map((row) => {
      const normalized: BulkImportProductsRow = {
        ...row,
        pd_catid: normalizeLookupValue(
          String(row.pd_catid ?? ""),
          categoryLookup
        ),
        pd_catsubid: normalizeLookupValue(
          String(row.pd_catsubid ?? ""),
          categoryLookup
        ),
        pd_brand_type: normalizeLookupValue(
          String(row.pd_brand_type ?? ""),
          brandLookup
        ),
        pd_room_type: normalizeRoomType(String(row.pd_room_type ?? "")),
        pd_images: parseImageList(row.pd_images),
      }
      return normalized
    })
  }, [parsed, categoryLookup, brandLookup])

  // Fetch every live product once a CSV is loaded so SKU matching is complete.
  useEffect(() => {
    if (parsed && parsed.rows.length > 0) {
      fetchProducts({ perPage: "all" })
    }
  }, [parsed, fetchProducts])

  const comparison = useMemo<ComparisonRow[] | null>(() => {
    if (!normalizedRows) return null
    // Match on a normalized SKU (trimmed + lowercased) so casing/whitespace
    // differences between the sheet and the DB don't read as "Not in DB".
    const existingBySku = new Map(
      existingProducts.map((p) => [skuKey(p.sku), p])
    )

    return normalizedRows.map((row, index) => {
      const sku = String(row.pd_parent_sku ?? "").trim()
      const name = String(row.pd_name ?? "").trim() || "Unnamed product"
      const existing = sku ? existingBySku.get(skuKey(sku)) : undefined

      if (!existing) {
        return {
          index,
          name,
          sku: sku || "No SKU",
          status: "new",
          changes: [],
          variantDiffs: [],
          changeCount: 0,
        }
      }

      const changes: FieldChange[] = []
      for (const field of COMPARE_FIELDS) {
        const csvVal = row[field.csvKey]
        const dbVal = field.get(existing)
        if (!compareField(csvVal, dbVal, field.numeric)) {
          changes.push({
            label: field.label,
            csvValue: displayValue(csvVal),
            dbValue: displayValue(dbVal),
          })
        }
      }

      const variantDiffs = diffVariants(
        row.pd_variants ?? [],
        existing.variants ?? [],
        existing.id
      )
      const changeCount = changes.length + variantDiffs.length
      const hasChanges = changeCount > 0

      return {
        index,
        name,
        sku,
        status: hasChanges ? "changed" : "unchanged",
        changes,
        variantDiffs,
        changeCount,
        productId: existing.id,
      }
    })
  }, [normalizedRows, existingProducts])

  const summary = useMemo(() => {
    if (!comparison) return null
    return {
      total: comparison.length,
      changed: comparison.filter((r) => r.status === "changed").length,
      unchanged: comparison.filter((r) => r.status === "unchanged").length,
      newCount: comparison.filter((r) => r.status === "new").length,
    }
  }, [comparison])

  const visibleRows = useMemo(() => {
    if (!comparison) return []
    if (statusFilter === "all") return comparison
    return comparison.filter((r) => r.status === statusFilter)
  }, [comparison, statusFilter])

  const handlePickFile = async (file?: File | null) => {
    if (!file) return
    const lowerName = file.name.toLowerCase()
    setFileError("")
    setExpanded(new Set())
    setStatusFilter("all")

    try {
      if (lowerName.endsWith(".csv")) {
        setFileName(file.name)
        setCsvText(await file.text())
        return
      }
      if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
        const XLSX = await import("xlsx")
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: "array" })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        if (!firstSheet) {
          setFileError("The spreadsheet has no readable sheet.")
          return
        }
        setFileName(file.name)
        setCsvText(XLSX.utils.sheet_to_csv(firstSheet))
        return
      }
      setFileError("Please upload a .csv or .xlsx file.")
    } catch (error) {
      console.error("[Compare] File parse failed:", error)
      setFileError(
        "Could not read the file. Make sure it is a valid CSV or Excel file."
      )
    }
  }

  const handleFetchSheet = async () => {
    if (!sheetUrl.trim()) return
    setFileError("")
    setExpanded(new Set())
    setStatusFilter("all")
    setIsFetchingSheet(true)
    try {
      const response = await fetch(
        `/api/fetch-sheet?url=${encodeURIComponent(sheetUrl.trim())}`
      )
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string
        }
        throw new Error(body.error ?? `Request failed (${response.status}).`)
      }
      const text = await response.text()
      const gidMatch = sheetUrl.match(/[?&#]gid=(\d+)/)
      const gid = gidMatch ? gidMatch[1] : "0"
      setFileName(`Google Sheet${gid !== "0" ? ` (tab gid=${gid})` : ""}`)
      setCsvText(text)
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : "Failed to fetch Google Sheet."
      )
    } finally {
      setIsFetchingSheet(false)
    }
  }

  const handleReset = () => {
    setCsvText("")
    setFileName("")
    setSheetUrl("")
    setFileError("")
    setExpanded(new Set())
    setStatusFilter("all")
    if (inputRef.current) inputRef.current.value = ""
  }

  const toggleExpanded = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  // Pushes a single Google-Sheet color/hex/name value onto the live DB variant.
  const handleFixVariantField = async (
    variant: VariantDiff,
    change: FieldChange
  ) => {
    if (!change.fix || !variant.variantId) return
    const key = `${variant.variantId}:${change.fix.field}`
    if (fixingKeys.has(key)) return

    setFixingKeys((prev) => new Set(prev).add(key))
    try {
      await updateProductVariant({
        id: variant.productId,
        variantId: variant.variantId,
        data: { [change.fix.field]: change.fix.value },
      }).unwrap()
      showSuccessToast(`Updated ${change.label} for variant ${variant.sku}.`)
      // Refresh the live snapshot so the resolved diff disappears.
      await fetchProducts({ perPage: "all" })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not update the variant. Please try again."
      showErrorToast(message)
    } finally {
      setFixingKeys((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  // Applies every fixable color/hex/name diff for a variant in one request.
  const handleFixVariantColors = async (variant: VariantDiff) => {
    if (!variant.variantId) return
    const fixes = variant.changes.filter((c) => c.fix)
    if (fixes.length === 0) return
    const key = `${variant.variantId}:__all`
    if (fixingKeys.has(key)) return

    setFixingKeys((prev) => new Set(prev).add(key))
    try {
      const data: Record<string, string> = {}
      for (const change of fixes) {
        if (change.fix) data[change.fix.field] = change.fix.value
      }
      await updateProductVariant({
        id: variant.productId,
        variantId: variant.variantId,
        data,
      }).unwrap()
      showSuccessToast(`Updated color, hex & name for variant ${variant.sku}.`)
      await fetchProducts({ perPage: "all" })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not update the variant. Please try again."
      showErrorToast(message)
    } finally {
      setFixingKeys((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  const statusBadge = (status: ComparisonRow["status"]) => {
    const map = {
      changed: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
      unchanged: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
      new: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    }
    const label = {
      changed: "Changed",
      unchanged: "Unchanged",
      new: "Not in DB",
    }
    return (
      <span
        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${map[status]}`}
      >
        {label[status]}
      </span>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Info banner */}
      <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-6 py-3 dark:border-slate-800 dark:bg-slate-900/40">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Upload a CSV/Excel file to{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            compare against live products
          </span>
          . Products are matched by parent SKU and variants by variant SKU
          (including color, prices and images). Nothing is imported or
          modified — this only highlights differences.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {/* Source toggle */}
        <div className="mb-4 inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
          {[
            { value: "file" as const, label: "Upload File" },
            { value: "link" as const, label: "Google Sheets Link" },
          ].map((option) => (
            <button
              key={`compare-source-${option.value}`}
              type="button"
              onClick={() => setImportSource(option.value)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition sm:text-xs ${
                importSource === option.value
                  ? "bg-teal-600 text-white shadow-sm dark:bg-teal-400 dark:text-slate-950"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Upload control */}
        {importSource === "file" ? (
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(event) => handlePickFile(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-teal-500/25 transition hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              {fileName ? "Choose another file" : "Upload CSV / Excel"}
            </button>
            {fileName && (
              <span className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {fileName}
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline dark:hover:text-slate-200"
                >
                  clear
                </button>
              </span>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Paste your Google Sheet URL. The sheet must be shared as{" "}
              <span className="font-semibold">
                Anyone with the link can view
              </span>
              . The tab in the URL (its <code>gid</code>) is the one compared.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                type="url"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => void handleFetchSheet()}
                disabled={isFetchingSheet || !sheetUrl.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60 dark:bg-teal-500 dark:hover:bg-teal-400"
              >
                {isFetchingSheet ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    Fetching…
                  </>
                ) : (
                  "Load Sheet"
                )}
              </button>
              {fileName && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline dark:hover:text-slate-200"
                >
                  clear
                </button>
              )}
            </div>
          </div>
        )}

        {fileError && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
            {fileError}
          </p>
        )}
        {parseError && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
            {parseError}
          </p>
        )}

        {/* Empty state */}
        {!parsed && !parseError && (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-14 text-center dark:border-slate-700">
            <svg
              className="h-10 w-10 text-slate-300 dark:text-slate-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 17v-6h6v6m-9 4h12a2 2 0 002-2V7l-5-4H6a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
              No file uploaded yet
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Upload a product CSV to see what differs from the live database.
            </p>
          </div>
        )}

        {/* Loading — wait for the full product list before judging matches. */}
        {parsed && !hasLoadedProducts && (
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            Loading live products…
          </p>
        )}

        {/* Summary + results */}
        {comparison && summary && hasLoadedProducts && (
          <div className="mt-6 space-y-5">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Compared against{" "}
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {existingProducts.length}
              </span>{" "}
              live product(s){isFetching ? " (loading…)" : ""}. SKU matching
              ignores case and surrounding spaces.
            </p>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  key: "all" as const,
                  label: "Total in CSV",
                  value: summary.total,
                  tone: "text-slate-700 dark:text-slate-200",
                },
                {
                  key: "changed" as const,
                  label: "Changed",
                  value: summary.changed,
                  tone: "text-amber-600 dark:text-amber-400",
                },
                {
                  key: "unchanged" as const,
                  label: "Unchanged",
                  value: summary.unchanged,
                  tone: "text-slate-500 dark:text-slate-400",
                },
                {
                  key: "new" as const,
                  label: "Not in DB",
                  value: summary.newCount,
                  tone: "text-sky-600 dark:text-sky-400",
                },
              ].map((card) => (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => setStatusFilter(card.key)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    statusFilter === card.key
                      ? "border-teal-400 bg-teal-50/50 dark:border-teal-500 dark:bg-teal-500/10"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                  }`}
                >
                  <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                    {card.label}
                  </p>
                  <p className={`mt-1 text-2xl font-bold ${card.tone}`}>
                    {card.value}
                  </p>
                </button>
              ))}
            </div>

            {/* Results table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-semibold tracking-wide text-slate-400 uppercase dark:bg-slate-900/40">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Changes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-sm text-slate-400"
                      >
                        No products match this filter.
                      </td>
                    </tr>
                  )}
                  {visibleRows.map((row) => {
                    const isOpen = expanded.has(row.index)
                    const canExpand = row.changeCount > 0
                    const variantSummary = row.variantDiffs.length
                      ? ` · ${row.variantDiffs.length} variant${
                          row.variantDiffs.length > 1 ? "s" : ""
                        }`
                      : ""
                    return (
                      <Fragment key={`row-${row.index}`}>
                        <tr
                          className={`${
                            canExpand
                              ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
                              : ""
                          }`}
                          onClick={() => canExpand && toggleExpanded(row.index)}
                        >
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                            <div className="flex items-center gap-2">
                              {canExpand && (
                                <svg
                                  className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${
                                    isOpen ? "rotate-90" : ""
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                              )}
                              {row.name}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                            {row.sku}
                          </td>
                          <td className="px-4 py-3">{statusBadge(row.status)}</td>
                          <td className="px-4 py-3 text-right text-xs text-slate-500 dark:text-slate-400">
                            {row.status === "changed"
                              ? `${row.changes.length} field${
                                  row.changes.length === 1 ? "" : "s"
                                }${variantSummary}`
                              : "—"}
                          </td>
                        </tr>
                        {isOpen && canExpand && (
                          <tr>
                            <td
                              colSpan={4}
                              className="space-y-4 bg-slate-50/60 px-4 py-3 dark:bg-slate-900/30"
                            >
                              {/* Product-level field changes */}
                              {row.changes.length > 0 && (
                                <div>
                                  <p className="mb-1.5 text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                                    Product fields
                                  </p>
                                  <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-white text-[10px] font-semibold tracking-wide text-slate-400 uppercase dark:bg-slate-900">
                                        <tr>
                                          <th className="px-3 py-2">Field</th>
                                          <th className="px-3 py-2">Live (DB)</th>
                                          <th className="px-3 py-2">CSV</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {row.changes.map((change) => (
                                          <tr key={`${row.index}-${change.label}`}>
                                            <td className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">
                                              {change.label}
                                            </td>
                                            <td className="px-3 py-2">
                                              <span className="rounded bg-rose-50 px-1.5 py-0.5 font-mono break-all text-rose-600 line-through dark:bg-rose-500/10 dark:text-rose-300">
                                                {change.dbValue}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2">
                                              <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono break-all text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                                {change.csvValue}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* Variant changes */}
                              {row.variantDiffs.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                                    Variants
                                  </p>
                                  {row.variantDiffs.map((variant) => (
                                    <div
                                      key={`${row.index}-var-${variant.sku}`}
                                      className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
                                    >
                                      <div className="flex items-center gap-2 bg-white px-3 py-2 dark:bg-slate-900">
                                        <span className="font-medium text-slate-700 dark:text-slate-200">
                                          {variant.name}
                                        </span>
                                        <span className="font-mono text-[10px] text-slate-400">
                                          {variant.sku}
                                        </span>
                                        <span
                                          className={`ml-auto rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                                            variant.status === "new"
                                              ? "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
                                              : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                                          }`}
                                        >
                                          {variant.status === "new"
                                            ? "New variant"
                                            : "Changed"}
                                        </span>
                                        {variant.variantId &&
                                          variant.changes.filter((c) => c.fix)
                                            .length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                void handleFixVariantColors(
                                                  variant
                                                )
                                              }
                                              disabled={fixingKeys.has(
                                                `${variant.variantId}:__all`
                                              )}
                                              className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-700 transition hover:bg-teal-100 disabled:opacity-50 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300"
                                              title="Set the live color, hex and name to the Google Sheet values"
                                            >
                                              {fixingKeys.has(
                                                `${variant.variantId}:__all`
                                              )
                                                ? "Fixing…"
                                                : "Fix color, hex & name"}
                                            </button>
                                          )}
                                      </div>
                                      {variant.changes.length > 0 && (
                                        <table className="w-full text-left text-xs">
                                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {variant.changes.map((change) => {
                                              const fixKey =
                                                change.fix && variant.variantId
                                                  ? `${variant.variantId}:${change.fix.field}`
                                                  : null
                                              const isFixing = fixKey
                                                ? fixingKeys.has(fixKey)
                                                : false
                                              return (
                                                <tr
                                                  key={`${row.index}-${variant.sku}-${change.label}`}
                                                >
                                                  <td className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">
                                                    {change.label}
                                                  </td>
                                                  <td className="px-3 py-2">
                                                    <span className="rounded bg-rose-50 px-1.5 py-0.5 font-mono break-all text-rose-600 line-through dark:bg-rose-500/10 dark:text-rose-300">
                                                      {change.dbValue}
                                                    </span>
                                                  </td>
                                                  <td className="px-3 py-2">
                                                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono break-all text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                                      {change.csvValue}
                                                    </span>
                                                  </td>
                                                  <td className="px-3 py-2 text-right whitespace-nowrap">
                                                    {change.fix &&
                                                    variant.variantId ? (
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          void handleFixVariantField(
                                                            variant,
                                                            change
                                                          )
                                                        }
                                                        disabled={isFixing}
                                                        className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1 text-[10px] font-bold text-white transition hover:bg-teal-700 disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-400"
                                                        title={`Set the live ${change.label.toLowerCase()} to the Google Sheet value`}
                                                      >
                                                        {isFixing ? (
                                                          <svg
                                                            className="h-3 w-3 animate-spin"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                          >
                                                            <circle
                                                              className="opacity-25"
                                                              cx="12"
                                                              cy="12"
                                                              r="10"
                                                              stroke="currentColor"
                                                              strokeWidth="4"
                                                            />
                                                            <path
                                                              className="opacity-75"
                                                              fill="currentColor"
                                                              d="M4 12a8 8 0 018-8v8z"
                                                            />
                                                          </svg>
                                                        ) : (
                                                          "Fix"
                                                        )}
                                                      </button>
                                                    ) : null}
                                                  </td>
                                                </tr>
                                              )
                                            })}
                                          </tbody>
                                        </table>
                                      )}
                                      {variant.status === "new" && (
                                        <p className="px-3 py-2 text-[11px] text-slate-400">
                                          This variant SKU is not in the live
                                          database.
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-slate-100 px-6 py-3 dark:border-slate-800">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
