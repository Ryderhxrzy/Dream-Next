"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import {
  useGetSupplierMeQuery,
  useUpdateSupplierLogoMutation,
} from "@/store/api/suppliersApi"
import {
  AtSign,
  Building2,
  Camera,
  CheckCircle2,
  Loader2,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/libs/toast"

export default function SupplierCompanyPage() {
  const { data, isLoading, isError } = useGetSupplierMeQuery()
  const [updateLogo, { isLoading: isUpdatingLogo }] =
    useUpdateSupplierLogoMutation()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLogoUpload = async (file: File | undefined) => {
    if (!file) return
    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        file.type
      )
    ) {
      showErrorToast("Only JPEG, PNG, WEBP, or GIF images are allowed.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showErrorToast("Image must be 5 MB or smaller.")
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/supplier/upload", {
        method: "POST",
        body: formData,
      })
      const json = await res.json()
      if (!res.ok || !json.url) throw new Error(json.error || "Upload failed.")
      await updateLogo({ logo_url: json.url }).unwrap()
      showSuccessToast("Company logo updated.")
    } catch (err) {
      showErrorToast(
        err instanceof Error ? err.message : "Failed to update logo."
      )
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2.5 py-40 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading company profile...</span>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 dark:border-rose-500/20 dark:bg-rose-500/10">
        <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
          Could not load company profile. Please refresh the page.
        </p>
      </div>
    )
  }

  const isBusy = uploading || isUpdatingLogo

  const fields = [
    {
      icon: <Building2 className="h-4 w-4" />,
      label: "Company",
      value: data.supplier_name ?? "—",
      tone: "text-indigo-500",
      bg: "bg-indigo-50 dark:bg-indigo-500/10",
    },
    {
      icon: <User className="h-4 w-4" />,
      label: "Full Name",
      value: data.name,
      tone: "text-sky-500",
      bg: "bg-sky-50 dark:bg-sky-500/10",
    },
    {
      icon: <AtSign className="h-4 w-4" />,
      label: "Username",
      value: `@${data.username}`,
      tone: "text-violet-500",
      bg: "bg-violet-50 dark:bg-violet-500/10",
    },
    {
      icon: <Mail className="h-4 w-4" />,
      label: "Email",
      value: data.email || "—",
      tone: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
    },
    {
      icon: <ShieldCheck className="h-4 w-4" />,
      label: "Role",
      value: data.is_main_supplier ? "Main Supplier" : "Sub Supplier",
      tone: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-500/10",
    },
  ]

  return (
    <div className="space-y-6 pb-10">
      <div>
        <p className="text-[10px] font-bold tracking-[0.24em] text-indigo-600 uppercase dark:text-indigo-400">
          Supplier
        </p>
        <h1 className="mt-0.5 text-[30px] font-black tracking-tight text-slate-900 dark:text-white">
          Company Profile
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Your company and account details.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        {/* Logo card */}
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500">
            Company Logo
          </p>
          <div className="relative">
            <div className="h-28 w-28 overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-100 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              {data.supplier_logo ? (
                <Image
                  src={data.supplier_logo}
                  alt={data.supplier_name ?? "Company logo"}
                  width={112}
                  height={112}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Building2 className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => fileInputRef.current?.click()}
              className="absolute -right-2 -bottom-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-white shadow-md transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-900"
            >
              {isBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => void handleLogoUpload(e.target.files?.[0])}
            />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-slate-900 dark:text-white">
              {data.supplier_name ?? "—"}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Click the camera icon to update logo
            </p>
          </div>
        </div>

        {/* Details card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
            <h2 className="text-sm font-bold tracking-wide text-slate-700 uppercase dark:text-slate-200">
              Account Details
            </h2>
          </div>
          <dl className="divide-y divide-slate-100 dark:divide-slate-800">
            {fields.map(({ icon, label, value, tone, bg }) => (
              <div key={label} className="flex items-center gap-4 px-6 py-4">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg} ${tone}`}
                >
                  {icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                    {label}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {value}
                  </p>
                </div>
                {label === "Role" && data.is_main_supplier && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                )}
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
