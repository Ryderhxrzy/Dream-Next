import SupplierCataloguePage from "@/components/supplier/SupplierCataloguePage"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "My Catalogue",
  description: "Manage your brand product catalogue flipbook.",
  path: "/supplier/catalogue",
  noIndex: true,
})

export const dynamic = "force-dynamic"

export default function Page() {
  return <SupplierCataloguePage />
}
