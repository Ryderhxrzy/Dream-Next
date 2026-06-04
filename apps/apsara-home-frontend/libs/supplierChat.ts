type SupplierSession = {
  user?: {
    accessToken?: string
  }
}

// Module-level token cache — avoids re-fetching the session on every poll iteration
let _supplierTokenCache: { value: string; expiresAt: number } | null = null
const TOKEN_CACHE_TTL_MS = 30_000
const SESSION_TIMEOUT_MS = 8_000

export type SupplierChatMessage = {
  id: number
  conversation_id: number
  sender_type: 'admin' | 'supplier'
  sender_admin_id: number | null
  sender_supplier_user_id: number | null
  message: string
  attachment_url: string | null
  attachment_type: 'image' | 'video' | 'file' | null
  attachment_name: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
  updated_at: string
}

export type SupplierChatConversation = {
  id: number
  subject: string
  status: 'open' | 'pending' | 'resolved'
  company: {
    id: number
    name: string
    logo: string | null
  } | null
  supplier_user: {
    id: number
    name: string
    username: string
  } | null
  assigned_admin: {
    id: number
    name: string
    email: string
    avatar_url?: string | null
  } | null
  counterpart_label: string
  last_message: {
    id: number
    message: string
    sender_type: 'admin' | 'supplier'
    sent_at: string | null
  } | null
  message_count: number
  unread_count: number
  last_message_at: string | null
  created_at: string
  updated_at: string
  messages?: SupplierChatMessage[]
}

type ApiEnvelope<T> = {
  data: T
  message?: string
}

const getApiBaseUrl = () => {
  const base = String(process.env.NEXT_PUBLIC_LARAVEL_API_URL ?? '').trim()
  return base.replace(/\/+$/, '')
}

const CHAT_REQUEST_TIMEOUT_MS = 30000

async function getSupplierAccessToken(): Promise<string> {
  const now = Date.now()
  if (_supplierTokenCache && _supplierTokenCache.expiresAt > now) {
    return _supplierTokenCache.value
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), SESSION_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch('/api/supplier/auth/session', {
      method: 'GET',
      cache: 'no-store',
      credentials: 'include',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    })
  } catch (err: unknown) {
    if (controller.signal.aborted) {
      throw new Error('Supplier session request timed out. Please refresh the page.')
    }
    throw err
  } finally {
    window.clearTimeout(timeoutId)
  }

  if (!response.ok) {
    throw new Error('Your supplier session has expired. Please sign in again.')
  }

  const session = (await response.json()) as SupplierSession
  const accessToken = session?.user?.accessToken

  if (!accessToken) {
    throw new Error('Your supplier session is missing an access token.')
  }

  _supplierTokenCache = { value: accessToken, expiresAt: now + TOKEN_CACHE_TTL_MS }
  return accessToken
}

async function supplierChatRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const apiBase = getApiBaseUrl()
  if (!apiBase) {
    throw new Error('Supplier chat API is not configured.')
  }

  const accessToken = await getSupplierAccessToken()
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), CHAT_REQUEST_TIMEOUT_MS)
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    signal: controller.signal,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  }).catch((error: unknown) => {
    if (controller.signal.aborted) {
      throw new Error('Supplier chat request timed out. Please try again.')
    }
    throw error
  })

  try {
    const data = (await response.json().catch(() => null)) as T | ApiEnvelope<unknown> | null

    if (!response.ok) {
      const message =
        typeof data === 'object' && data && 'message' in data && typeof data.message === 'string'
          ? data.message
          : 'Unable to load supplier chat.'
      throw new Error(message)
    }

    return data as T
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export async function fetchSupplierChatConversations(search = '') {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
  const response = await supplierChatRequest<{ data: SupplierChatConversation[] }>(`/api/supplier/chat/conversations${query}`)
  return response.data ?? []
}

export async function fetchSupplierChatConversation(conversationId: number) {
  const response = await supplierChatRequest<{ data: SupplierChatConversation }>(`/api/supplier/chat/conversations/${conversationId}`)
  return response.data
}

type AttachmentPayload = {
  attachment_url: string
  attachment_type: 'image' | 'video' | 'file'
  attachment_name: string
}

export async function sendSupplierChatMessage(
  conversationId: number,
  message: string,
  attachment?: AttachmentPayload,
) {
  const response = await supplierChatRequest<{ data: SupplierChatMessage }>(
    `/api/supplier/chat/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ message: message || undefined, ...attachment }),
    },
  )
  return response.data
}

export async function uploadSupplierChatAttachment(file: File): Promise<AttachmentPayload> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/supplier/upload', { method: 'POST', body: form })
  const json = (await res.json()) as { url?: string; type?: string; name?: string; error?: string }
  if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload failed.')
  return {
    attachment_url: json.url,
    attachment_type: (json.type ?? 'file') as 'image' | 'video' | 'file',
    attachment_name: json.name ?? file.name,
  }
}

export async function sendSupplierPresenceHeartbeat(): Promise<void> {
  try {
    await supplierChatRequest<{ ok: boolean }>('/api/supplier/presence/heartbeat', { method: 'POST' })
  } catch {
    // silently ignore — heartbeat failure should never break the UI
  }
}

export async function createSupplierChatConversation(subject: string, message: string) {
  const response = await supplierChatRequest<{ data: SupplierChatConversation }>(
    '/api/supplier/chat/conversations',
    {
      method: 'POST',
      body: JSON.stringify({ subject, message }),
    },
  )

  return response.data
}
