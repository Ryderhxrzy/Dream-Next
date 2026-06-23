import { serverFetch } from "@/libs/serverFetch"
import type { Category } from "@/store/api/categoriesApi"

type ApiCategoriesResponse = {
  categories?: Category[]
}

export async function getNavbarCategories(): Promise<Category[]> {
  const apiUrl =
    process.env.LARAVEL_API_URL ?? process.env.NEXT_PUBLIC_LARAVEL_API_URL
  if (!apiUrl) return []

  try {
    const response = await serverFetch(
      `${apiUrl}/api/categories?page=1&per_page=100`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        // Public, shared navbar data — cache and refresh via the
        // storefront:categories tag (see /api/revalidate/storefront).
        next: { revalidate: 300, tags: ["storefront:categories"] },
      }
    )

    if (!response.ok) return []

    const payload = (await response.json()) as ApiCategoriesResponse
    return Array.isArray(payload.categories) ? payload.categories : []
  } catch {
    return []
  }
}
