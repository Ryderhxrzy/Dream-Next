const API_URL =
  process.env.NEXT_PUBLIC_COMMUNITY_API_URL ?? "http://localhost:4000"

type ApiOptions = RequestInit & {
  token?: string | null
}

export async function api<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { token, headers, ...rest } = options

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      ...(rest.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.message ?? "Request failed")
  }

  return data as T
}
