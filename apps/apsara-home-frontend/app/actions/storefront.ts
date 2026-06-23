"use server"

import { revalidateTag } from "next/cache"

/**
 * Refresh the public storefront data caches (SSR/data cache) so admin changes
 * appear without a hard refresh. Invoked from the admin UI after a successful
 * save. Runs server-side as a Server Action, so it does not need the shared
 * x-store-revalidate-secret that the HTTP route requires.
 */
export async function revalidateStorefrontAction() {
  revalidateTag("storefront:categories", "max")
  revalidateTag("storefront:products", "max")
  revalidateTag("storefront:shop-builder", "max")
  revalidateTag("storefront:partner-storefronts", "max")
  revalidateTag("cms:blogs", "max")
}
