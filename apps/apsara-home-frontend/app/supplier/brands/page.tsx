import SupplierBrandsPage from "@/components/supplier/SupplierBrandsPage"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "My Brands",
  description: "Your brands and brand requests on AF Home.",
  path: "/supplier/brands",
  noIndex: true,
})

export const dynamic = "force-dynamic"

export default function Page() {
  return <SupplierBrandsPage />
}
