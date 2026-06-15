"use client"

import { useState } from "react"
import { CheckoutOnlineBankingProvider } from "@/store/api/paymentApi"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle } from "lucide-react"
import Image from "next/image"

import { PaymentMethod, PaymentMode } from "@/types/CustomerCheckout/types"

interface Props {
  selectedMethod: PaymentMethod
  onSelect: (m: PaymentMethod) => void
  notice: string
  paymentMode: PaymentMode
  paymentModeOptions: PaymentMode[]
  onPaymentModeChange: (mode: PaymentMode) => void
  selectedOnlineBankingProvider: CheckoutOnlineBankingProvider
  onOnlineBankingProviderChange: (
    provider: CheckoutOnlineBankingProvider
  ) => void
  showOnlineBankingProviderPicker: boolean
  paymentModeSource?: "local" | "admin" | "hidden"
}

const onlineBankingOptions: Array<{
  id: CheckoutOnlineBankingProvider
  label: string
  description: string
}> = [
  {
    id: "dob",
    label: "BDO",
    description: "Currently supported online banking option via PayMongo",
  },
]
const cardOptions = ["Visa", "Mastercard"]

const paymentMethods = [
  {
    id: "gcash" as PaymentMethod,
    label: "GCash",
    note: "Pay via GCash wallet",
    badge: "Popular",
    badgeColor: "bg-blue-500",
    logos: ["https://1000logos.net/wp-content/uploads/2023/05/GCash-Logo.png"],
  },
  {
    id: "maya" as PaymentMethod,
    label: "Maya",
    note: "Pay via Maya wallet",
    badge: "Fast",
    badgeColor: "bg-emerald-500",
    logos: [
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRBLMVQZTu66K6hYmx4Ea-VbLaevkjWEHAzWw&s",
    ],
  },
  {
    id: "online_banking" as PaymentMethod,
    label: "Online Banking",
    note: "Instapay / PesoNet",
    badge: "Bank Transfer",
    badgeColor: "bg-sky-500",
    logos: ["https://cdn.simpleicons.org/visa"],
  },
  {
    id: "card" as PaymentMethod,
    label: "Credit / Debit Card",
    note: "Visa or Mastercard",
    badge: "3DS Secured",
    badgeColor: "bg-slate-700",
    logos: [
      "https://cdn.simpleicons.org/visa",
      "https://download.logo.wine/logo/Mastercard/Mastercard-Logo.wine.png",
    ],
  },
]

export default function CustomerCheckoutPaymentMethod({
  selectedMethod,
  onSelect,
  notice,
  paymentMode,
  paymentModeOptions,
  onPaymentModeChange,
  selectedOnlineBankingProvider,
  onOnlineBankingProviderChange,
  showOnlineBankingProviderPicker,
  paymentModeSource = "hidden",
}: Props) {
  const [selectedCard, setSelectedCard] = useState(cardOptions[0])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="mb-4 flex items-center gap-2.5 text-sm font-bold text-slate-800 dark:text-white">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white">
          3
        </div>
        Payment Method
      </h2>

      {paymentModeOptions.length > 1 && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-slate-700 uppercase dark:text-slate-300">
                Payment Mode
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {paymentModeSource === "local"
                  ? "Local checkout testing is enabled on this host."
                  : "Test mode is currently enabled by admin for customer checkout visibility."}
              </p>
            </div>
            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
              {paymentModeOptions.map((mode) => {
                const selected = paymentMode === mode
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onPaymentModeChange(mode)}
                    className={`rounded-xl px-4 py-2 text-xs font-bold capitalize transition ${
                      selected
                        ? "bg-slate-700 text-white dark:bg-slate-600"
                        : "text-slate-600 hover:bg-white dark:text-slate-400 dark:hover:bg-slate-700"
                    }`}
                  >
                    {mode}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Method cards */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {paymentMethods.map((method) => {
          const selected = selectedMethod === method.id
          return (
            <button
              key={method.id}
              onClick={() => onSelect(method.id)}
              className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                selected
                  ? "border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-900/20"
                  : "border-slate-200 bg-white hover:border-sky-200 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-700"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-800">
                {method.logos.length === 1 ? (
                  <div className="relative h-full w-full">
                    <Image
                      src={method.logos[0]}
                      alt={method.label}
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center gap-0.5">
                    {method.logos.map((logo) => (
                      <div key={logo} className="relative h-3.5 w-4 shrink-0">
                        <Image
                          src={logo}
                          alt=""
                          fill
                          className="object-contain"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-800 dark:text-white">
                    {method.label}
                  </span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold text-white ${method.badgeColor}`}
                  >
                    {method.badge}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                  {method.note}
                </p>
              </div>
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                  selected
                    ? "border-sky-500 bg-sky-500 dark:border-sky-400 dark:bg-sky-500"
                    : "border-slate-300 dark:border-slate-600"
                }`}
              >
                {selected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="h-2 w-2 rounded-full bg-white"
                  />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Bank sub-selector */}
      <AnimatePresence>
        {selectedMethod === "online_banking" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-900/20">
              {showOnlineBankingProviderPicker ? (
                <>
                  <p className="mb-2.5 text-xs font-bold text-sky-700 dark:text-sky-400">
                    Choose your bank
                  </p>
                  <p className="mb-3 text-[11px] text-sky-700 dark:text-sky-400/80">
                    Local mode lets you pin the currently supported bank before
                    redirecting to PayMongo.
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {onlineBankingOptions.map((bank) => (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={() => onOnlineBankingProviderChange(bank.id)}
                        className={`rounded-xl border-2 px-3 py-3 text-left transition-all ${
                          selectedOnlineBankingProvider === bank.id
                            ? "border-sky-600 bg-sky-600 text-white dark:border-sky-500 dark:bg-sky-600"
                            : "border-sky-200 bg-white text-sky-700 hover:border-sky-400 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-400 dark:hover:border-sky-600"
                        }`}
                      >
                        <p className="text-xs font-bold">{bank.label}</p>
                        <p
                          className={`mt-1 text-[11px] ${selectedOnlineBankingProvider === bank.id ? "text-sky-100" : "text-sky-700 dark:text-sky-400/70"}`}
                        >
                          {bank.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold text-sky-700 dark:text-sky-400">
                    Bank selection will continue on the PayMongo payment page.
                  </p>
                  <p className="mt-2 text-[11px] text-sky-700 dark:text-sky-400/80">
                    Live mode sends only the currently supported online banking
                    option to PayMongo, so the final bank UI will appear after
                    redirect.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card sub-selector */}
      <AnimatePresence>
        {selectedMethod === "card" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
              <p className="mb-2.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                Select card type
              </p>
              <div className="flex gap-2">
                {cardOptions.map((card) => (
                  <button
                    key={card}
                    onClick={() => setSelectedCard(card)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-2.5 transition-all ${
                      selectedCard === card
                        ? "border-slate-800 bg-slate-50 dark:border-slate-600 dark:bg-slate-800"
                        : "border-slate-200 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="relative h-6 w-10 shrink-0">
                      <Image
                        src={`/payment-logos/${card.toLowerCase()}.svg`}
                        alt={card}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {card}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notice */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-900/20"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
              {notice}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
