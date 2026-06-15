import SupplierInventoryPage from "@/components/supplier/SupplierInventoryPage"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Supplier Inventory",
  description: "Live ZQ warehouse inventory for Global Supplier products.",
  path: "/supplier/inventory",
  noIndex: true,
})

export const dynamic = "force-dynamic"

export default function Page() {
  return <SupplierInventoryPage />
}
