import type { Product } from "@/store/api/productsApi"

const toSearchableText = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : ""

const toSearchableNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? String(value) : ""

const compactSearchText = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "").replace(/[aeiou]/g, "")

const tokenizeQuery = (query: string) =>
  query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)

const buildProductHaystacks = (product: Product) => {
  const variantHaystacks = (product.variants ?? []).flatMap((variant) => [
    toSearchableText(variant.sku),
    toSearchableText(variant.name),
    toSearchableText(variant.color),
    toSearchableText(variant.style),
    toSearchableText(variant.size),
    toSearchableNumber(variant.width),
    toSearchableNumber(variant.dimension),
    toSearchableNumber(variant.height),
  ])

  return [
    toSearchableText(product.name),
    toSearchableText(product.brand),
    toSearchableText(product.sku),
    toSearchableText(product.description),
    toSearchableText(product.specifications),
    toSearchableText(product.material),
    toSearchableText(product.uploaderName),
    toSearchableText(product.uploaderEmail),
    ...variantHaystacks,
  ].filter(Boolean)
}

const matchesSearchValue = (value: string, term: string) => {
  if (value.includes(term)) return true

  const compactValue = compactSearchText(value)
  const compactTerm = compactSearchText(term)
  return compactTerm.length > 0 && compactValue.includes(compactTerm)
}

export const matchesProductSearch = (product: Product, query: string) => {
  const terms = tokenizeQuery(query)
  if (terms.length === 0) return true

  const haystacks = buildProductHaystacks(product)
  if (haystacks.length === 0) return false

  return terms.every((term) =>
    haystacks.some((value) => matchesSearchValue(value, term))
  )
}

export type SearchMatchField = "name" | "brand" | "sku" | "other"

export const getProductMatchField = (
  product: Product,
  query: string
): SearchMatchField => {
  const terms = tokenizeQuery(query)
  if (terms.length === 0) return "name"

  const name = toSearchableText(product.name)
  if (terms.every((t) => matchesSearchValue(name, t))) return "name"

  const brand = toSearchableText(product.brand)
  if (brand && terms.every((t) => matchesSearchValue(brand, t))) return "brand"

  const sku = toSearchableText(product.sku)
  if (sku && terms.every((t) => matchesSearchValue(sku, t))) return "sku"

  const variantSkus = (product.variants ?? [])
    .map((v) => toSearchableText(v.sku))
    .filter(Boolean)
  if (variantSkus.some((s) => terms.every((t) => matchesSearchValue(s, t))))
    return "sku"

  return "other"
}
