import { useAuthStore } from "@/store/auth.store"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"

export type ConnectionStatus =
  | "NONE"
  | "PENDING_OUTGOING"
  | "PENDING_INCOMING"
  | "CONNECTED"

export type ConnectionUser = {
  id: string
  name: string
  avatarUrl: string | null
  location: string | null
}

export type UserProfileBundle = {
  id: string
  name: string
  avatarUrl: string | null
  isSelf: boolean
  connectionStatus: ConnectionStatus
  connectionCount: number
  bio: string | null
  location: string | null
  coverUrl: string | null
  occupation: string | null
  role: string | null
  interests: string[]
}

/** Another user's public profile bundle (info + profile + connection status). */
export function useUserProfile(userId: string | undefined) {
  const token = useAuthStore((s) => s.token)
  return useQuery({
    queryKey: ["user-profile", userId, token],
    queryFn: () => api<UserProfileBundle>(`/profile/${userId}`, { token }),
    enabled: !!token && !!userId,
  })
}

export function useMyConnections() {
  const token = useAuthStore((s) => s.token)
  return useQuery({
    queryKey: ["connections", token],
    queryFn: () => api<ConnectionUser[]>("/connections", { token }),
    enabled: !!token,
  })
}

export function useConnectionRequests() {
  const token = useAuthStore((s) => s.token)
  return useQuery({
    queryKey: ["connection-requests", token],
    queryFn: () => api<ConnectionUser[]>("/connections/requests", { token }),
    enabled: !!token,
  })
}

export function useMutualConnections(
  userId: string | undefined,
  enabled: boolean
) {
  const token = useAuthStore((s) => s.token)
  return useQuery({
    queryKey: ["mutual", userId, token],
    queryFn: () =>
      api<ConnectionUser[]>(`/connections/${userId}/mutual`, { token }),
    enabled: !!token && !!userId && enabled,
  })
}

/** Send / accept / remove a connection with a given user. */
export function useConnectionActions(userId: string) {
  const token = useAuthStore((s) => s.token)
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["user-profile", userId] })
    queryClient.invalidateQueries({ queryKey: ["connections"] })
    queryClient.invalidateQueries({ queryKey: ["connection-requests"] })
    queryClient.invalidateQueries({ queryKey: ["mutual"] })
  }

  const connect = useMutation({
    mutationFn: () => api(`/connections/${userId}`, { method: "POST", token }),
    onSuccess: invalidate,
  })
  const accept = useMutation({
    mutationFn: () =>
      api(`/connections/${userId}/accept`, { method: "POST", token }),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: () =>
      api(`/connections/${userId}`, { method: "DELETE", token }),
    onSuccess: invalidate,
  })

  return { connect, accept, remove }
}
