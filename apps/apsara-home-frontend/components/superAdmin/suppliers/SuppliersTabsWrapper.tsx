'use client'

import { useState } from 'react'
import SuppliersPageMain from './SuppliersPageMain'
import WarehouseTab from './WarehouseTab'

type SuppliersTab = 'suppliers' | 'warehouse'

export default function SuppliersTabsWrapper() {
  const [tab, setTab] = useState<SuppliersTab>('suppliers')

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('suppliers')}
            className={
              tab === 'suppliers'
                ? 'rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white'
                : 'rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
            }
          >
            Suppliers
          </button>
          <button
            type="button"
            onClick={() => setTab('warehouse')}
            className={
              tab === 'warehouse'
                ? 'rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white'
                : 'rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
            }
          >
            Warehouse
          </button>
        </div>
      </div>

      {tab === 'suppliers' && <SuppliersPageMain />}
      {tab === 'warehouse' && <WarehouseTab />}
    </div>
  )
}
