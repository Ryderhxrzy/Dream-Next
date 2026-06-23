"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"

import AddProductModal from "./AddProductModal"

export default function AddProductPageMain() {
  const router = useRouter()
  const goToProducts = () => router.push("/admin/products")

  return (
    <div className="space-y-4">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Products
      </Link>

      <AddProductModal
        isOpen
        asPage
        onClose={goToProducts}
        onSaved={goToProducts}
      />
    </div>
  )
}
