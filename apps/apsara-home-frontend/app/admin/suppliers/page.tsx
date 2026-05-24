import { buildPageMetadata } from '@/app/seo'
import SuppliersPageMain from '@/components/superAdmin/suppliers/SuppliersPageMain'

export const metadata = buildPageMetadata({
  title: 'Admin Suppliers',
  description: 'Browse the Admin Suppliers page on AF Home.',
  path: '/admin/suppliers',
  noIndex: true,
})

export default function AdminSuppliersPage() {
  return <SuppliersPageMain />
}
