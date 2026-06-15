const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])

export function normalizeRequestHost(value: string | null | undefined): string {
  const trimmed = String(value ?? "")
    .trim()
    .toLowerCase()
  if (!trimmed) return ""

  const withoutProtocol = trimmed.replace(/^https?:\/\//i, "")
  const host = withoutProtocol.split("/")[0] ?? ""
  return host.split(":")[0] ?? ""
}

export function shouldUseTurnstile(host: string | null | undefined): boolean {
  const normalizedHost = normalizeRequestHost(host)
  if (!normalizedHost) return false
  return !LOCAL_HOSTS.has(normalizedHost)
}
