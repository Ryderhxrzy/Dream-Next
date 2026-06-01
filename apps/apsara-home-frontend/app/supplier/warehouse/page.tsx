import { buildPageMetadata } from '@/app/seo'
import SupplierWarehousePageClient from '@/components/supplier/SupplierWarehousePage'

export const metadata = buildPageMetadata({
  title: 'Warehouse',
  description: 'Warehouse settings for suppliers.',
  path: '/supplier/warehouse',
  noIndex: true,
})

export default function SupplierWarehousePage() {
  return <SupplierWarehousePageClient />
}

