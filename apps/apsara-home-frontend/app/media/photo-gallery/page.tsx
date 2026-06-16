import { getNavbarCategories } from "@/libs/serverStorefront"

import PhotoGalleryPageClient from "@/components/media/PhotoGalleryPageClient"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Photo Gallery",
  description: "Browse our Photo Gallery on AF Home.",
  path: "/media/photo-gallery",
  noIndex: true,
})
export const dynamic = "force-dynamic"

async function Page() {
  const initialCategories = await getNavbarCategories()
  return <PhotoGalleryPageClient initialCategories={initialCategories} />
}

export default Page
