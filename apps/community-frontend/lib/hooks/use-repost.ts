import { useAuthStore } from "@/store/auth.store"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"

export function useRepost() {
  const queryClient = useQueryClient()
  const token = useAuthStore((state) => state.token)

  return useMutation({
    mutationFn: ({ postId, caption }: { postId: string; caption: string }) =>
      api(`/posts/${postId}/repost`, {
        method: "POST",
        token,
        body: JSON.stringify({ caption }),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["community-posts"] }),
  })
}
