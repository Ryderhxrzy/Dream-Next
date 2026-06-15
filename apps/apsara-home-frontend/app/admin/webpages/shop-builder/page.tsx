import ShopBuilderStudio from "@/components/superAdmin/webpages/ShopBuilderStudio"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Admin Shop Builder",
  description: "Prepare the shop page builder workspace for AF Home.",
  path: "/admin/webpages/shop-builder",
  noIndex: true,
})

export default function AdminShopBuilderPage() {
  return <ShopBuilderStudio />
}
