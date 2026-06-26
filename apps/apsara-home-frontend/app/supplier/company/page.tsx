import SupplierCompanyPage from "@/components/supplier/SupplierCompanyPage"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Supplier Company",
  description: "Browse your supplier company profile on AF Home.",
  path: "/supplier/company",
  noIndex: true,
})

export default function SupplierCompanyRoute() {
  return <SupplierCompanyPage />
}
