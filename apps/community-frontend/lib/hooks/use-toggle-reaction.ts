import { useAuthStore } from "@/store/auth.store"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { CommunityPost } from "@/lib/hooks/use-community-posts"

type ReactionResult = { liked: boolean; count: number }

export function useToggleReaction() {
  const queryClient = useQueryClient()
  const token = useAuthStore((state) => state.token)

  return useMutation({
    mutationFn: (postId: string) =>
      api<ReactionResult>(`/posts/${postId}/react`, { method: "POST", token }),

    // Optimistic update — flip the like instantly before the server responds
    onMutate: async (postId: string) => {
      await queryClient.cancelQueries({ queryKey: ["community-posts"] })
      const previous = queryClient.getQueryData<CommunityPost[]>([
        "community-posts",
      ])

      queryClient.setQueryData<CommunityPost[]>(["community-posts"], (old) =>
        old?.map((post) => {
          if (post.id !== postId) return post
          const liked = !post.viewerHasReacted
          return {
            ...post,
            viewerHasReacted: liked,
            counts: {
              ...post.counts,
              reactions: post.counts.reactions + (liked ? 1 : -1),
            },
          }
        })
      )

      return { previous }
    },

    onError: (_err, _postId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["community-posts"], context.previous)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] })
    },
  })
}
