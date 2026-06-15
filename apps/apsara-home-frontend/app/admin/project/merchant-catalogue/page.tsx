import MerchantCataloguePage from "@/components/superAdmin/project/MerchantCataloguePage"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Merchant Catalogue",
  description: "Create and manage flipbook catalogues for merchant brands.",
  path: "/admin/project/merchant-catalogue",
  noIndex: true,
})

export default function AdminMerchantCataloguePage() {
  return <MerchantCataloguePage />
}
