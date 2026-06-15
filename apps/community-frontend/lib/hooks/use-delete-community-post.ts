import { useAuthStore } from "@/store/auth.store"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"

export function useDeleteCommunityPost() {
  const queryClient = useQueryClient()
  const token = useAuthStore((state) => state.token)

  return useMutation({
    mutationFn: (postId: string) =>
      api(`/posts/${postId}`, { method: "DELETE", token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] })
    },
  })
}
