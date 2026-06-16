// ─────────────────────────────────────────────────────────────────────────────
// ui/Primitives.tsx — Reusable UI atoms
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react"

// ── Section eyebrow label ──────────────────────────────────────────────────
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="h-px w-8 bg-[#d4a514]" />
      <span className="text-[0.65rem] font-medium tracking-[0.22em] text-[#9c7420] uppercase">
        {children}
      </span>
    </div>
  )
}

// ── Form field wrapper ─────────────────────────────────────────────────────
export function FormField({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[0.68rem] font-medium tracking-[0.14em] text-slate-500 uppercase">
        {label}
        {required && <span className="ml-1 text-[#d4a514]">*</span>}
      </label>
      {children}
    </div>
  )
}

// ── Text input ─────────────────────────────────────────────────────────────
export function InputField({
  type = "text",
  placeholder,
  value,
  onChange,
  name,
}: {
  type?: string
  placeholder: string
  value: string
  onChange: (val: string) => void
  name?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="w-full rounded-[4px] bg-white px-4 py-3 text-sm text-slate-800 transition-all duration-300 outline-none placeholder:text-slate-300"
      style={{
        border: focused
          ? "1px solid rgba(212,165,20,0.7)"
          : "1px solid rgba(15,23,42,0.12)",
        boxShadow: focused ? "0 0 0 3px rgba(212,165,20,0.12)" : "none",
      }}
    />
  )
}

// ── Select field ───────────────────────────────────────────────────────────
export function SelectField({
  options,
  placeholder,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  placeholder: string
  value: string
  onChange: (val: string) => void
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full cursor-pointer appearance-none rounded-[4px] bg-white px-4 py-3 text-sm transition-all duration-300 outline-none"
        style={{
          color: value ? "#1e293b" : "#94a3b8",
          border: focused
            ? "1px solid rgba(212,165,20,0.7)"
            : "1px solid rgba(15,23,42,0.12)",
          boxShadow: focused ? "0 0 0 3px rgba(212,165,20,0.12)" : "none",
        }}
      >
        <option value="" disabled hidden>
          {placeholder}
        </option>
        {options.map((o) => (
          <option
            key={o.value}
            value={o.value}
            className="bg-white text-slate-800"
          >
            {o.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs text-slate-400">
        ▾
      </div>
    </div>
  )
}

// ── Textarea field ─────────────────────────────────────────────────────────
export function TextareaField({
  placeholder,
  value,
  onChange,
  rows = 5,
}: {
  placeholder: string
  value: string
  onChange: (val: string) => void
  rows?: number
}) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      rows={rows}
      className="w-full resize-none rounded-[4px] bg-white px-4 py-3 text-sm text-slate-800 transition-all duration-300 outline-none placeholder:text-slate-300"
      style={{
        border: focused
          ? "1px solid rgba(212,165,20,0.7)"
          : "1px solid rgba(15,23,42,0.12)",
        boxShadow: focused ? "0 0 0 3px rgba(212,165,20,0.12)" : "none",
      }}
    />
  )
}

// ── Primary CTA button ─────────────────────────────────────────────────────
export function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  type?: "button" | "submit"
  disabled?: boolean
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="group relative overflow-hidden rounded-[4px] bg-[#111111] px-7 py-3.5 text-[0.72rem] font-semibold tracking-[0.14em] text-white uppercase transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(17,17,17,0.28)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="relative z-10">{children}</span>
      <div className="absolute inset-0 bg-gradient-to-r from-[#d4a514] to-[#c9891b] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </button>
  )
}

// ── Ghost button ───────────────────────────────────────────────────────────
export function GhostButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-[0.72rem] tracking-[0.14em] text-slate-400 uppercase transition-colors duration-300 hover:text-[#9c7420]"
    >
      {children}
    </button>
  )
}
