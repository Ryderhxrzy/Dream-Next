import { getNavbarCategories } from "@/libs/serverStorefront"

import GuestTrackOrderPage from "@/components/orders/GuestTrackOrderPage"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Track Order",
  description:
    "Track your AF Home guest order using your order number and checkout contact details.",
  path: "/track-order",
})

export default async function TrackOrderPage() {
  const navbarCategories = await getNavbarCategories()
  return <GuestTrackOrderPage initialCategories={navbarCategories} />
}
