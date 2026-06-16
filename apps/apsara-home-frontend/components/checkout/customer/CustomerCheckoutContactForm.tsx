"use client"

import { AlertCircle, Check, Gift, WalletCards } from "lucide-react"

import { FormErrors, GuestForm } from "@/types/CustomerCheckout/types"

interface CustomerCheckoutContactFormProps {
  form: GuestForm
  errors: FormErrors
  setField: (key: keyof GuestForm, value: string) => void
  lockReferralField?: boolean
  referralSourceCode?: string
  showReferral?: boolean
  voucherStatus?: {
    loading?: boolean
    error?: string | null
    appliedAmount?: number | null
    message?: string | null
  }
  egcStatus?: {
    available: number
    appliedAmount: number
    error?: string | null
    loading?: boolean
    disabled?: boolean
  }
  cashbackStatus?: {
    available: number
    appliedAmount: number
    error?: string | null
    loading?: boolean
    disabled?: boolean
  }
}

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  error,
  fieldKey,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  type?: string
  required?: boolean
  error?: string
  fieldKey?: keyof GuestForm
}) => (
  <div
    data-error-field={fieldKey}
    className="transition-transform duration-200"
  >
    <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
      {label}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-700 placeholder-slate-300 transition-all focus:ring-2 focus:outline-none dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500 ${
        error
          ? "border-red-300 focus:border-red-400 focus:ring-red-200 dark:border-red-600 dark:focus:border-red-500 dark:focus:ring-red-900"
          : "border-slate-200 focus:border-sky-400 focus:ring-sky-200 dark:border-slate-700 dark:focus:border-sky-500 dark:focus:ring-sky-900"
      }`}
    />
    {error && (
      <p className="mt-1 text-[11px] text-red-500 dark:text-red-400">{error}</p>
    )}
  </div>
)

const CustomerCheckoutContactForm = ({
  form,
  errors,
  setField,
  lockReferralField = false,
  referralSourceCode = "",
  showReferral = true,
  voucherStatus,
  egcStatus,
  cashbackStatus,
}: CustomerCheckoutContactFormProps) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="mb-4 flex items-center gap-2.5 text-sm font-bold text-slate-800 dark:text-white">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white">
          1
        </div>
        Contact information
      </h2>
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Full Name"
            value={form.name}
            onChange={(v) => setField("name", v)}
            placeholder="Enter Full Name"
            required
            error={errors.name}
            fieldKey="name"
          />
          <Field
            label="Email"
            value={form.email}
            onChange={(v) => setField("email", v)}
            placeholder="Enter Email"
            required
            error={errors.email}
            fieldKey="email"
          />
        </div>
        <Field
          label="Phone Number"
          value={form.phone}
          onChange={(v) => setField("phone", v)}
          placeholder="Enter Phone Number"
          required
          error={errors.phone}
          fieldKey="phone"
        />

        {/* DIVIDER */}
        <div className="flex items-center gap-3 pt-1">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase dark:text-slate-500">
            Optional
          </span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* REFERRAL + VOUCHER */}
        {showReferral && (
          <div
            data-error-field="referred_by"
            className="transition-transform duration-200"
          >
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Referred By <span className="ml-0.5 text-red-500">*</span>
            </label>
            <div className="relative">
              <Gift className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={form.referred_by}
                onChange={(e) => setField("referred_by", e.target.value)}
                placeholder="Enter name or referral ID"
                maxLength={60}
                disabled={lockReferralField}
                className={`w-full rounded-xl border py-2.5 pr-4 pl-10 text-sm placeholder-slate-300 transition-all focus:ring-2 focus:outline-none dark:placeholder-slate-500 ${
                  lockReferralField
                    ? "cursor-not-allowed border-emerald-200 bg-emerald-50 text-emerald-800 focus:border-emerald-300 focus:ring-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 dark:focus:border-emerald-600 dark:focus:ring-emerald-900"
                    : errors.referred_by
                      ? "border-red-300 bg-white text-slate-700 focus:border-red-400 focus:ring-red-200 dark:border-red-600 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-red-500 dark:focus:ring-red-900"
                      : "border-slate-200 bg-white text-slate-700 focus:border-sky-400 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-sky-500 dark:focus:ring-sky-900"
                }`}
                required
              />
            </div>
            {errors.referred_by ? (
              <p className="mt-1 text-[11px] text-red-500 dark:text-red-400">
                {errors.referred_by}
              </p>
            ) : lockReferralField && referralSourceCode ? (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                <Check className="h-3 w-3 shrink-0" />
                Shared shopping link detected. This checkout is locked to
                <span className="font-semibold break-all">
                  {" "}
                  {referralSourceCode}
                </span>
                .
              </p>
            ) : (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                <AlertCircle className="h-3 w-3 shrink-0" />
                Enter who referred you only if no affiliate shopping link was
                shared with you.
              </p>
            )}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Voucher Coupon
          </label>
          <div className="relative">
            <Gift className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={form.voucher_coupon}
              onChange={(e) =>
                setField("voucher_coupon", e.target.value.toUpperCase())
              }
              placeholder="Enter voucher code"
              maxLength={30}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 font-mono text-sm tracking-widest text-slate-700 uppercase placeholder-slate-300 transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-200 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-sky-500 dark:focus:ring-sky-900"
            />
          </div>
          {voucherStatus?.loading ? (
            <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              Checking voucher…
            </p>
          ) : voucherStatus?.error ? (
            <p className="mt-1.5 text-[11px] text-rose-500 dark:text-rose-400">
              {voucherStatus.error}
            </p>
          ) : (voucherStatus?.appliedAmount ?? 0) > 0 ? (
            <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
              {voucherStatus?.message ||
                `Voucher applied: -PHP ${(voucherStatus?.appliedAmount ?? 0).toLocaleString()}`}
            </p>
          ) : (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
              <AlertCircle className="h-3 w-3 shrink-0" />
              Apply your voucher coupon code if available.
            </p>
          )}
        </div>

        {cashbackStatus && !cashbackStatus.disabled ? (
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Personal Cashback Discount
              </label>
              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                Balance: PHP {cashbackStatus.available.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/70 px-3.5 py-2.5 dark:border-rose-900/50 dark:bg-rose-950/20">
              <WalletCards className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {cashbackStatus.loading
                    ? "Checking available cashback..."
                    : cashbackStatus.appliedAmount > 0
                      ? `Auto-applied: -PHP ${cashbackStatus.appliedAmount.toLocaleString()}`
                      : "No cashback discount applied"}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Personal cashback is auto-deducted only when this product
                  passes supplier discount rules.
                </p>
              </div>
            </div>
            {cashbackStatus.error ? (
              <p className="mt-1.5 text-[11px] text-rose-500 dark:text-rose-400">
                {cashbackStatus.error}
              </p>
            ) : cashbackStatus.appliedAmount > 0 ? (
              <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                Personal cashback will be deducted automatically after payment
                is confirmed.
              </p>
            ) : (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                <AlertCircle className="h-3 w-3 shrink-0" />
                Available cashback stays unused when this order has no eligible
                cashback discount.
              </p>
            )}
          </div>
        ) : null}

        {egcStatus ? (
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                AF-GC Store Credit
              </label>
              <span className="text-[11px] font-semibold text-fuchsia-600 dark:text-fuchsia-400">
                Balance: PHP {egcStatus.available.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-fuchsia-100 bg-fuchsia-50/70 px-3.5 py-2.5 dark:border-fuchsia-900/50 dark:bg-fuchsia-950/20">
              <WalletCards className="h-4 w-4 shrink-0 text-fuchsia-600 dark:text-fuchsia-400" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {egcStatus.loading
                    ? "Checking available AF-GC..."
                    : egcStatus.appliedAmount > 0
                      ? `Auto-applied: -PHP ${egcStatus.appliedAmount.toLocaleString()}`
                      : "No AF-GC applied"}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  AF-GC is auto-deducted only when this product passes admin
                  discount rules.
                </p>
              </div>
            </div>
            {egcStatus.error ? (
              <p className="mt-1.5 text-[11px] text-rose-500 dark:text-rose-400">
                {egcStatus.error}
              </p>
            ) : egcStatus.appliedAmount > 0 ? (
              <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                AF-GC will be deducted automatically after payment is confirmed.
              </p>
            ) : (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                <AlertCircle className="h-3 w-3 shrink-0" />
                Available balance stays unused when this order has no eligible
                AF-GC discount.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default CustomerCheckoutContactForm
