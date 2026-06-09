import { buildPageMetadata } from '@/app/seo'
import SupplierCataloguePage from '@/components/supplier/SupplierCataloguePage'

export const metadata = buildPageMetadata({
  title: 'My Catalogue',
  description: 'Manage your brand product catalogue flipbook.',
  path: '/supplier/catalogue',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default function Page() {
  return <SupplierCataloguePage />
}
