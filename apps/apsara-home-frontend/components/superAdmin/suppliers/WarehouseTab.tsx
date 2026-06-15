"use client"

import { useState } from "react"
import { useGetSuppliersQuery } from "@/store/api/suppliersApi"
import { useGetAdminSupplierWarehousesQuery } from "@/store/api/supplierWarehouseApi"

export default function WarehouseTab() {
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(
    null
  )

  const { data: suppliersData, isLoading: isLoadingSuppliers } =
    useGetSuppliersQuery()
  const suppliers = suppliersData?.suppliers ?? []

  const {
    data: warehouseData,
    isLoading: isLoadingWarehouses,
    isFetching,
  } = useGetAdminSupplierWarehousesQuery(selectedSupplierId!, {
    skip: selectedSupplierId === null,
  })
  const warehouses = warehouseData?.warehouses ?? []

  const selectedSupplier =
    suppliers.find((s) => s.id === selectedSupplierId) ?? null
  const supplierLabel =
    selectedSupplier?.company || selectedSupplier?.name || ""

  return (
    <div className="space-y-5">
      {/* Company selector */}
      <div className="animate-fade-up-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Select Supplier Company
        </p>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M3 9.5L12 4l9 5.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M9 21v-7h6v7"
              />
            </svg>
          </span>
          <select
            value={selectedSupplierId ?? ""}
            onChange={(e) =>
              setSelectedSupplierId(
                e.target.value !== "" ? Number(e.target.value) : null
              )
            }
            disabled={isLoadingSuppliers}
            className="w-full appearance-none rounded-2xl border border-cyan-200 bg-white py-3.5 pl-11 pr-10 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-cyan-500/30 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-cyan-500/20"
          >
            <option value="">
              {isLoadingSuppliers
                ? "Loading companies..."
                : "— Select a company —"}
            </option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.company || supplier.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
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
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </span>
        </div>
      </div>

      {/* Empty state — nothing selected */}
      {selectedSupplierId === null ? (
        <div className="animate-fade-up-in rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/60">
          <div className="mx-auto mb-3 flex h-12 w-12 animate-float items-center justify-center rounded-2xl bg-cyan-50 dark:bg-cyan-500/10">
            <svg
              className="h-6 w-6 text-cyan-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M3 9.5L12 4l9 5.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M9 21v-7h6v7"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Select a supplier company to view their warehouses.
          </p>
        </div>
      ) : isLoadingWarehouses || isFetching ? (
        <div className="animate-fade-up-in rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="google-loading-bar mb-3 rounded-full" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading warehouses...
          </p>
        </div>
      ) : warehouses.length === 0 ? (
        <div className="animate-fade-up-in rounded-2xl border border-amber-200 bg-amber-50 px-6 py-10 text-center dark:border-amber-500/20 dark:bg-amber-500/10">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            {supplierLabel} has no warehouses yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Section header */}
          <div className="animate-fade-up-in flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 dark:bg-cyan-500/10">
              <svg
                className="h-5 w-5 text-cyan-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M3 9.5L12 4l9 5.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M9 21v-7h6v7"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Warehouses
                </span>
                <span className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-2 py-0.5 text-xs font-bold text-white">
                  {warehouses.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                All warehouses under {supplierLabel}
              </p>
            </div>
          </div>

          {/* Cards grid */}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {warehouses.map((warehouse, index) => (
              <div
                key={warehouse.id}
                style={{ animationDelay: `${index * 80}ms` }}
                className="animate-fade-up-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:shadow-cyan-500/5"
              >
                {/* Image */}
                {warehouse.image_url ? (
                  <img
                    src={warehouse.image_url}
                    alt={warehouse.warehouse_name}
                    className="w-full object-contain"
                  />
                ) : (
                  <div className="flex h-44 w-full items-center justify-center bg-slate-100 dark:bg-slate-800">
                    <svg
                      className="h-10 w-10 text-slate-300 dark:text-slate-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 9.5L12 4l9 5.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 21v-7h6v7"
                      />
                    </svg>
                  </div>
                )}

                {/* Card body */}
                <div className="p-5">
                  {/* Name row */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-500/10">
                      <svg
                        className="h-4 w-4 text-cyan-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M3 9.5L12 4l9 5.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M9 21v-7h6v7"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {warehouse.warehouse_name}
                      </p>
                      <div className="mt-1 flex items-start gap-1.5">
                        <svg
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {warehouse.warehouse_address}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Map links */}
                  {warehouse.google_maps_url || warehouse.waze_url ? (
                    <div className="mt-4 flex gap-2">
                      {warehouse.google_maps_url ? (
                        <a
                          href={warehouse.google_maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-cyan-200 bg-white py-2.5 text-xs font-semibold text-cyan-600 transition-all duration-200 hover:-translate-y-0.5 hover:bg-cyan-50 hover:shadow-sm dark:border-cyan-500/30 dark:bg-slate-900 dark:text-cyan-300 dark:hover:bg-cyan-500/10"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                          </svg>
                          Google Maps
                        </a>
                      ) : null}
                      {warehouse.waze_url ? (
                        <a
                          href={warehouse.waze_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-violet-200 bg-white py-2.5 text-xs font-semibold text-violet-600 transition-all duration-200 hover:-translate-y-0.5 hover:bg-violet-50 hover:shadow-sm dark:border-violet-500/30 dark:bg-slate-900 dark:text-violet-300 dark:hover:bg-violet-500/10"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M20.03 4.26C18.07 2.3 15.42 1 12.5 1 6.7 1 2 5.7 2 11.5c0 2.06.59 4 1.6 5.64L2 22l5.03-1.55A10.46 10.46 0 0012.5 22C18.3 22 23 17.3 23 11.5c0-2.92-1.3-5.57-2.97-7.24zM12.5 20c-1.73 0-3.35-.5-4.72-1.36l-.34-.2-3 .92.95-2.93-.22-.36A8.48 8.48 0 014 11.5C4 6.81 7.81 3 12.5 3S21 6.81 21 11.5 17.19 20 12.5 20zm4.62-6.37c-.25-.13-1.49-.74-1.72-.82-.23-.08-.4-.13-.57.13-.17.25-.65.82-.8.99-.15.17-.3.19-.55.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.25-1.49-1.4-1.74-.14-.25-.01-.38.11-.51.11-.11.25-.3.38-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.57-1.37-.78-1.88-.2-.49-.41-.42-.57-.43h-.49c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.57.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.1-.23-.16-.49-.29z" />
                          </svg>
                          Waze
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
