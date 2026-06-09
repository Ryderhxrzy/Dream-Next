import { buildPageMetadata } from '@/app/seo'
import MerchantCataloguePage from '@/components/superAdmin/project/MerchantCataloguePage'

export const metadata = buildPageMetadata({
  title: 'Merchant Catalogue',
  description: 'Create and manage flipbook catalogues for merchant brands.',
  path: '/admin/project/merchant-catalogue',
  noIndex: true,
})

export default function AdminMerchantCataloguePage() {
  return <MerchantCataloguePage />
}
