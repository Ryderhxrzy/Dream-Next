const DEFAULT_TIMEOUT_MS = 10_000

/**
 * Wrapper around fetch that aborts after a timeout so server components never
 * hang indefinitely when the Laravel backend is unreachable or slow.
 */
export async function serverFetch(url: string, init?: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}
