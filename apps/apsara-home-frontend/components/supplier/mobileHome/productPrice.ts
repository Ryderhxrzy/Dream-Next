// Shared price logic mirroring the mobile app's ItemCard, so the Mobile Home
// builder grid and the phone preview show the same member-price-first display:
//   • default price shown = member price (falls back to original when unset)
//   • original price shown struck-through only when there's a real discount
//   • "Save ₱X" / "X% OFF" + PV figures derived the same way everywhere

export interface PricedProduct {
  price?: number | null
  original_price?: number | null
  member_price?: number | null
  pv?: number | null
}

export interface PriceInfo {
  original: number
  display: number
  hasDiscount: boolean
  save: number
  discountPct: number
  pv: number
}

export function getPriceInfo(p: PricedProduct): PriceInfo {
  const original = p.original_price ?? p.price ?? 0
  // member price wins, but 0/empty means "unset" → fall back to original (matches ItemCard)
  const display = p.member_price && p.member_price > 0 ? p.member_price : original
  const hasDiscount = original > 0 && display < original
  const save = hasDiscount ? original - display : 0
  const discountPct = hasDiscount ? Math.round((save / original) * 100) : 0
  const pv = Number(p.pv ?? 0)
  return { original, display, hasDiscount, save, discountPct, pv }
}

export const peso = (n: number) => `₱${n.toLocaleString()}`
