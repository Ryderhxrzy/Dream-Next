import { buildPageMetadata } from '@/app/seo'

export const metadata = buildPageMetadata({
  title: 'Warehouse',
  description: 'Warehouse settings for suppliers.',
  path: '/supplier/warehouse',
  noIndex: true,
})

export default function SupplierWarehousePage() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">Warehouse</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">Text only for now.</p>
    </div>
  )
}

