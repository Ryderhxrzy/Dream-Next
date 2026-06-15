"use client"

import { useState } from "react"

import Icon from "./Icons"

const PasswordInput = ({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
}) => {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder ?? "********"}
        className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
      >
        {show ? (
          <Icon.EyeOff className="h-4 w-4" />
        ) : (
          <Icon.Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  )
}

export default PasswordInput
