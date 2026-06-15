import ImportImagePageMain from "@/components/superAdmin/products/ImportImagePageMain"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Import Image",
  description:
    "Upload product images to Cloudinary and copy the resulting URLs.",
  path: "/admin/products/import-image",
  noIndex: true,
})

export default function AdminImportImagePage() {
  return <ImportImagePageMain />
}
