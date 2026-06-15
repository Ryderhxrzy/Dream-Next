"use client"

import { useState } from "react"
import { CategoryProduct } from "@/libs/CategoryData"
import type { Product, ProductVariant } from "@/store/api/productsApi"
import { AnimatePresence, motion } from "framer-motion"
import { useSession } from "next-auth/react"
import Image from "next/image"

import { CustomerCheckoutData } from "@/types/CustomerCheckout/types"
import OutlineButton from "@/components/ui/buttons/OutlineButton"
import PrimaryButton from "@/components/ui/buttons/PrimaryButton"
import Loading from "@/components/Loading"

type CheckoutSummaryProduct = CategoryProduct | Product

interface Props {
  checkoutData: CustomerCheckoutData | null
  loading: boolean
  onSubmit: () => void
  voucher?: {
    code: string
    discount: number
    sourceType?: string | null
  } | null
  cashbackApplied?: number
  egcApplied?: number
  computedTotal?: number
  subtotalOverride?: number
  unitPriceOverride?: number
  shippingFee?: number | null
  shippingRatePending?: boolean
  shippingRateUnavailable?: boolean
  shippingAddressLabel?: string
  checkoutDisabledReason?: string
  fullProduct?: CheckoutSummaryProduct | null
}

export default function CustomerCheckoutOrderSummary({
  checkoutData,
  loading,
  onSubmit,
  voucher,
  cashbackApplied = 0,
  egcApplied = 0,
  computedTotal,
  subtotalOverride,
  unitPriceOverride,
  shippingFee,
  shippingRatePending = false,
  shippingRateUnavailable = false,
  shippingAddressLabel = "",
  checkoutDisabledReason,
  fullProduct,
}: Props) {
  const { data: session, status } = useSession()
  const role = String(session?.user?.role ?? "").toLowerCase()
  const isLoggedIn =
    status === "authenticated" && (role === "customer" || role === "")
  const canUseMemberPrice = isLoggedIn && status === "authenticated"

  const [variantPickerOpen, setVariantPickerOpen] = useState(false)
  const variantOptions = (fullProduct?.variants ?? []).filter((v) =>
    Boolean(v.color || v.style || v.size || v.name || v.sku)
  )

  if (!checkoutData) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          No checkout data yet.
        </div>
      </div>
    )
  }

  const {
    product,
    quantity,
    selectedColor,
    selectedStyle,
    selectedSize,
    selectedType,
    selectedSku,
    items = [],
    subtotal,
    handlingFee,
    total,
  } = checkoutData
  const hasSelectedItems = items.length > 0
  const effectiveQuantity = hasSelectedItems
    ? items.reduce(
        (sum, item) => sum + Math.max(1, Number(item.quantity ?? 1)),
        0
      )
    : Math.max(1, Number(quantity ?? 1))
  const unitPv = hasSelectedItems
    ? items.reduce(
        (sum, item) => sum + Number(item.prodpv ?? 0) * item.quantity,
        0
      )
    : Number(product.prodpv ?? 0)
  const totalPv = hasSelectedItems ? unitPv : unitPv * effectiveQuantity
  const displayUnitPrice =
    typeof unitPriceOverride === "number" ? unitPriceOverride : product.price
  const displaySubtotal =
    typeof subtotalOverride === "number" ? subtotalOverride : subtotal
  const voucherDiscount = Math.max(0, Number(voucher?.discount ?? 0))
  const cashbackDiscount = Math.max(0, Number(cashbackApplied ?? 0))
  const egcDiscount = Math.max(0, Number(egcApplied ?? 0))
  const isPersonalCashbackDiscount =
    isLoggedIn && voucher?.sourceType === "personal_cashback"
  const voucherDiscountLabel = isPersonalCashbackDiscount
    ? "Personal Cashback Discount"
    : `Voucher (${voucher?.code ?? "Applied"})`
  const displayTotal = typeof computedTotal === "number" ? computedTotal : total
  const displayShippingFee =
    typeof shippingFee === "number" ? shippingFee : Number(handlingFee ?? 0)
  const isCheckoutDisabled = loading || Boolean(checkoutDisabledReason)
  const selectedOptions = [
    selectedColor ? { label: "Color", value: selectedColor } : null,
    selectedStyle ? { label: "Style", value: selectedStyle } : null,
    selectedSize ? { label: "Size", value: selectedSize } : null,
    selectedType ? { label: "Type", value: selectedType } : null,
    selectedSku ? { label: "SKU", value: selectedSku } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item))

  const handleChangeVariant = () => {
    setVariantPickerOpen(true)
  }

  const handleVariantSelect = (variant: ProductVariant) => {
    if (!checkoutData) return

    const updatedCheckoutData = {
      ...checkoutData,
      variantId: variant.id ?? null,
      selectedColor: variant.color || null,
      selectedStyle: variant.style || null,
      selectedSize: variant.size || null,
      selectedType: variant.name || null,
      selectedSku: variant.sku || null,
      product: {
        ...checkoutData.product,
        price: variant.priceSrp || checkoutData.product.price,
        image: variant.images?.[0] || checkoutData.product.image,
        sku: variant.sku || checkoutData.product.sku,
      },
      subtotal:
        (variant.priceSrp || checkoutData.product.price) *
        checkoutData.quantity,
    }

    localStorage.setItem("guest_checkout", JSON.stringify(updatedCheckoutData))
    setVariantPickerOpen(false)
    // Trigger a custom event to notify parent component
    window.dispatchEvent(new CustomEvent("checkout-variant-changed"))
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <p className="mb-4 text-[10px] font-bold tracking-widest text-slate-400 uppercase dark:text-slate-400 dark:text-slate-500">
          Order Summary
        </p>

        {/* Product */}
        <div className="mb-4 flex gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 dark:border-sky-800 dark:bg-sky-900/20">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm leading-snug font-bold text-slate-800 dark:text-white">
              {product.name}
            </p>
            <p className="mt-1 text-sm font-extrabold text-sky-500">
              PHP {displayUnitPrice.toLocaleString()}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-600">
                Qty: {effectiveQuantity}
              </span>
              {selectedColor && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {selectedColor}
                </span>
              )}
              {selectedStyle && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {selectedStyle}
                </span>
              )}
              {selectedSize && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {selectedSize}
                </span>
              )}
              {selectedType && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {selectedType}
                </span>
              )}
              {selectedSku && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {selectedSku}
                </span>
              )}
            </div>
            {selectedOptions.length > 0 ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">
                    Selected Options
                  </p>
                  <OutlineButton
                    type="button"
                    onClick={handleChangeVariant}
                    className="!rounded-lg !px-2 !py-1 !text-[10px]"
                  >
                    {variantPickerOpen ? "Hide Options" : "Change Variant"}
                  </OutlineButton>
                </div>
                <div className="mt-2 space-y-1.5">
                  {selectedOptions.map((option) => (
                    <div
                      key={option.label}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="font-semibold text-slate-500 dark:text-slate-400">
                        {option.label}
                      </span>
                      <span className="text-right font-bold text-slate-800 dark:text-white">
                        {option.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Variant Picker */}
            <AnimatePresence>
              {variantPickerOpen &&
                fullProduct &&
                variantOptions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-3 overflow-hidden"
                  >
                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                      {variantOptions.map((variant, index) => {
                        const selectedVariantId = Number(
                          checkoutData?.variantId ?? 0
                        )
                        const variantId = Number(variant.id ?? 0)
                        const selectedSku = String(
                          checkoutData?.selectedSku ?? ""
                        ).trim()
                        const variantSku = String(variant.sku ?? "").trim()
                        const selectedTypeValue = String(
                          checkoutData?.selectedType ?? ""
                        )
                          .trim()
                          .toLowerCase()
                        const selectedColorValue = String(
                          checkoutData?.selectedColor ?? ""
                        )
                          .trim()
                          .toLowerCase()
                        const selectedStyleValue = String(
                          checkoutData?.selectedStyle ?? ""
                        )
                          .trim()
                          .toLowerCase()
                        const selectedSizeValue = String(
                          checkoutData?.selectedSize ?? ""
                        )
                          .trim()
                          .toLowerCase()
                        const variantMatchesSelectedDetails =
                          (!selectedTypeValue ||
                            String(variant.name ?? "")
                              .trim()
                              .toLowerCase() === selectedTypeValue) &&
                          (!selectedColorValue ||
                            String(variant.color ?? "")
                              .trim()
                              .toLowerCase() === selectedColorValue) &&
                          (!selectedStyleValue ||
                            String(variant.style ?? "")
                              .trim()
                              .toLowerCase() === selectedStyleValue) &&
                          (!selectedSizeValue ||
                            String(variant.size ?? "")
                              .trim()
                              .toLowerCase() === selectedSizeValue)
                        const isSelected =
                          selectedVariantId > 0 && variantId > 0
                            ? selectedVariantId === variantId
                            : selectedSku !== "" &&
                              variantSku !== "" &&
                              selectedSku === variantSku &&
                              variantMatchesSelectedDetails
                        const variantLabel =
                          variant.name?.trim() ||
                          variant.size?.trim() ||
                          `Variant ${index + 1}`
                        const variantMeta = [
                          variant.size?.trim() || "",
                          variant.color?.trim() || "",
                          variant.sku?.trim() || "",
                        ]
                          .filter(Boolean)
                          .join(" · ")

                        return (
                          <button
                            key={`${variant.sku ?? variant.id ?? index}-${index}`}
                            type="button"
                            onClick={() => handleVariantSelect(variant)}
                            className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                              isSelected
                                ? "border-sky-500 bg-sky-50"
                                : "border-slate-200 bg-white hover:border-slate-400"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-bold text-slate-800">
                                  {variantLabel}
                                </p>
                                {variantMeta && (
                                  <p className="mt-1 text-[10px] text-slate-500">
                                    {variantMeta}
                                  </p>
                                )}
                              </div>
                              {isSelected && (
                                <svg
                                  className="h-4 w-4 text-sky-500"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
            </AnimatePresence>
          </div>
        </div>

        {hasSelectedItems ? (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500">
              Selected Items
            </p>
            <div className="mt-3 space-y-3">
              {items.map((item) => (
                <div
                  key={`${item.cartItemId ?? item.id}-${item.selectedSku ?? item.variantId ?? ""}`}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white dark:bg-slate-800">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-bold text-slate-800 dark:text-white">
                      {item.name}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-600">
                        Qty: {item.quantity}
                      </span>
                      {item.selectedColor ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {item.selectedColor}
                        </span>
                      ) : null}
                      {item.selectedStyle ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {item.selectedStyle}
                        </span>
                      ) : null}
                      {item.selectedSize ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {item.selectedSize}
                        </span>
                      ) : null}
                      {item.selectedType ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {item.selectedType}
                        </span>
                      ) : null}
                      {item.selectedSku ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {item.selectedSku}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className="shrink-0 text-xs font-bold text-slate-800 dark:text-white">
                    PHP {(item.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Breakdown */}
        <div className="space-y-2.5 border-t border-slate-200 pt-3 text-sm dark:border-slate-700">
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Subtotal ({effectiveQuantity}x)</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              PHP {displaySubtotal.toLocaleString()}
            </span>
          </div>
          {voucherDiscount > 0 ? (
            <div className="flex justify-between text-emerald-600">
              <span>{voucherDiscountLabel}</span>
              <span className="font-semibold">
                -PHP {voucherDiscount.toLocaleString()}
              </span>
            </div>
          ) : null}
          {cashbackDiscount > 0 ? (
            <div className="flex justify-between text-rose-600">
              <span>Personal Cashback Discount</span>
              <span className="font-semibold">
                -PHP {cashbackDiscount.toLocaleString()}
              </span>
            </div>
          ) : null}
          {egcDiscount > 0 ? (
            <div className="flex justify-between text-fuchsia-600">
              <span>AF-GC Applied</span>
              <span className="font-semibold">
                -PHP {egcDiscount.toLocaleString()}
              </span>
            </div>
          ) : null}
          {canUseMemberPrice && (
            <>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>PV per item</span>
                <span className="font-semibold text-blue-700">
                  {unitPv.toLocaleString()} PV
                </span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Total PV</span>
                <span className="font-semibold text-blue-700">
                  {totalPv.toLocaleString()} PV
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span>Shipping fee</span>
              {!shippingRatePending &&
                !shippingRateUnavailable &&
                displayShippingFee === 0 && (
                  <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-700">
                    FREE
                  </span>
                )}
            </div>
            <span
              className={
                shippingRateUnavailable
                  ? "font-semibold text-rose-500"
                  : displayShippingFee === 0
                    ? "font-semibold text-green-600"
                    : "font-semibold text-slate-700 dark:text-slate-300"
              }
            >
              {shippingRatePending
                ? "Checking..."
                : shippingRateUnavailable
                  ? "Not available"
                  : displayShippingFee === 0
                    ? "PHP 0.00"
                    : `PHP ${displayShippingFee.toLocaleString()}`}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
          <span className="font-bold text-slate-800 dark:text-white">
            Total
          </span>
          <span className="text-xl font-extrabold text-sky-500">
            PHP {displayTotal.toLocaleString()}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/80">
          <svg
            className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {shippingRateUnavailable
              ? `Shipping is not available for this address${shippingAddressLabel ? ` (${shippingAddressLabel})` : ""}. Checkout will continue with PHP 0.00 shipping fee.`
              : "Shipping fee updates automatically based on the selected delivery city and province."}
          </p>
        </div>
      </div>

      {/* Place Order CTA */}
      <PrimaryButton
        onClick={onSubmit}
        disabled={isCheckoutDisabled}
        className="w-full !text-sm"
      >
        {loading ? (
          <>
            <Loading size={16} />
            <span>Processing...</span>
          </>
        ) : checkoutDisabledReason ? (
          <span>{checkoutDisabledReason}</span>
        ) : (
          <>
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Place Order · PHP {displayTotal.toLocaleString()}
          </>
        )}
      </PrimaryButton>

      {/* Security note */}
      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400 dark:text-slate-500">
        <svg
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        Secured by{" "}
        <span className="font-semibold text-slate-500 dark:text-slate-400">
          PayMongo
        </span>{" "}
        · SSL Encrypted
      </p>
    </div>
  )
}
