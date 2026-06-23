import { getNavbarCategories } from "@/libs/serverStorefront"

import Blogs from "@/components/Blogs"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Blog",
  description: "Browse the Blog page on AF Home.",
  path: "/blog",
})
// Public content page (only cached navbar data on the server); blog items are
// fetched client-side. Cache the shell instead of forcing dynamic rendering.
export const revalidate = 600

export default async function BlogPage() {
  const initialCategories = await getNavbarCategories()
  return <Blogs initialCategories={initialCategories} />
}
