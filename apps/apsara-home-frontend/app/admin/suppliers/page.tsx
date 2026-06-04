import { buildPageMetadata } from '@/app/seo'
import SuppliersTabsWrapper from '@/components/superAdmin/suppliers/SuppliersTabsWrapper'

export const metadata = buildPageMetadata({
  title: 'Admin Suppliers',
  description: 'Browse the Admin Suppliers page on AF Home.',
  path: '/admin/suppliers',
  noIndex: true,
})

export default function AdminSuppliersPage() {
  return <SuppliersTabsWrapper />
}
