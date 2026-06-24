import { revalidateStorefrontAction } from "@/app/actions/storefront"

export async function revalidateStorefront() {
  try {
    // Server Action invalidates the public storefront tags directly. The old
    // HTTP route required a shared secret the browser could not send (always
    // 401), so admin changes never actually refreshed the public cache.
    await revalidateStorefrontAction()
  } catch {
    // Best-effort cache refresh only.
  }
}
