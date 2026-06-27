"use client"

import { ImagePlus, Link2, X } from "lucide-react"
import CloudinaryUploadButton from "@/components/supplier/CloudinaryUploadButton"

interface ImageInputProps {
  value: string
  onChange: (url: string) => void
  label?: string
}

/**
 * A single image field that accepts both a Cloudinary widget upload and a
 * manually pasted link. Shows a preview + clear button once a URL is set.
 */
export default function ImageInput({ value, onChange, label }: ImageInputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          {label}
        </label>
      )}

      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Preview"
            className="h-40 w-full object-cover"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-2 rounded-lg bg-slate-900/70 p-1.5 text-white transition hover:bg-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <CloudinaryUploadButton
          onUploaded={(urls) => onChange(urls[0] ?? "")}
          folder="apsara/supplier/home"
          className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition hover:border-sky-400 hover:bg-sky-50 hover:text-sky-600 dark:border-slate-600 dark:bg-slate-800/50 dark:hover:border-sky-500/50"
        >
          <ImagePlus className="h-6 w-6" />
          <span className="text-sm font-medium">Click to upload image</span>
          <span className="text-xs text-slate-400">Device, URL, camera, Drive…</span>
        </CloudinaryUploadButton>
      )}

      {/* Manual link field */}
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-900">
        <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Or paste an image link here"
          className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none dark:text-slate-200"
        />
      </div>
    </div>
  )
}
