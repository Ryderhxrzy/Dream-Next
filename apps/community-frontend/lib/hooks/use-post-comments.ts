import { useAuthStore } from "@/store/auth.store"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"

export type CommentAuthor = {
  id: string
  name: string
  avatarUrl: string | null
}

export type CommentReply = {
  id: string
  postId: string
  parentId: string
  content: string
  createdAt: string
  author: CommentAuthor
}

export type PostComment = {
  id: string
  postId: string
  content: string
  createdAt: string
  author: CommentAuthor
  replies: CommentReply[]
}

export function usePostComments(postId: string, enabled: boolean) {
  const token = useAuthStore((state) => state.token)

  return useQuery({
    queryKey: ["post-comments", postId],
    queryFn: () => api<PostComment[]>(`/posts/${postId}/comments`, { token }),
    enabled,
  })
}

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient()
  const token = useAuthStore((state) => state.token)

  return useMutation({
    mutationFn: (content: string) =>
      api<PostComment>(`/posts/${postId}/comments`, {
        method: "POST",
        token,
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-comments", postId] })
      queryClient.invalidateQueries({ queryKey: ["community-posts"] })
    },
  })
}

export function useCreateReply(postId: string, commentId: string) {
  const queryClient = useQueryClient()
  const token = useAuthStore((state) => state.token)

  return useMutation({
    mutationFn: (content: string) =>
      api<CommentReply>(`/posts/${postId}/comments/${commentId}/replies`, {
        method: "POST",
        token,
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-comments", postId] })
    },
  })
}
