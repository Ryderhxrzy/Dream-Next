'use client'

import { useMemo } from 'react'
import { Card } from '@heroui/react/card'
import { Chip } from '@heroui/react/chip'
import { useSession } from 'next-auth/react'
import { useGetSupplierCategoriesQuery } from '@/store/api/suppliersApi'
import DataTableShell from '@/components/superAdmin/DataTableShell'

export default function SupplierCategoriesPage() {
  const { data: session, status } = useSession()
  const supplierId = Number(session?.user?.supplierId ?? 0)
  const { data, isLoading, isError } = useGetSupplierCategoriesQuery(supplierId, {
    skip: status !== 'authenticated' || supplierId <= 0,
  })

  const categories = useMemo(() => data?.categories ?? [], [data?.categories])

  if (status === 'loading') {
    return (
      <Card className="border border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900">
        <Card.Content className="px-5 py-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading supplier session...</p>
        </Card.Content>
      </Card>
    )
  }

  if (supplierId <= 0) {
    return (
      <Card className="border border-amber-200 bg-amber-50 shadow-none dark:border-amber-500/20 dark:bg-amber-500/10">
        <Card.Content className="px-5 py-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            This supplier account is not linked to a supplier company yet.
          </p>
        </Card.Content>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <DataTableShell
        title="Assigned Categories"
        subtitle="View your product category assignments"
        badge={
          <Chip color="primary" size="sm">
            {categories.length} categor{categories.length === 1 ? 'y' : 'ies'}
          </Chip>
        }
      >
        {isLoading ? (
          <div className="px-5 py-16 text-center">
            <div className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <span className="text-sm text-slate-500 dark:text-slate-400">Loading categories…</span>
            </div>
          </div>
        ) : isError ? (
          <div className="px-5 py-4">
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
              Failed to load allowed categories.
            </p>
          </div>
        ) : categories.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800/60 mx-auto mb-3">
              <svg className="h-6 w-6 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-200">No categories assigned</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Ask the admin team to assign categories for your supplier.</p>
          </div>
        ) : (
          <div className="px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <Card
                  key={category.id}
                  className="border border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <Card.Content className="px-4 py-4">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {category.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      /{category.url || 'no-slug'}
                    </p>
                  </Card.Content>
                </Card>
              ))}
            </div>
          </div>
        )}
      </DataTableShell>
    </div>
  )
}
