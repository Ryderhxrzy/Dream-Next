import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import type { CommunityPost } from "@/lib/hooks/use-community-posts";

export function useSavedPosts() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["saved-posts"],
    queryFn: () => api<CommunityPost[]>("/posts/saved", { token }),
    enabled: !!token,
  });
}

export function useToggleSave() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) =>
      api<{ saved: boolean }>(`/posts/${postId}/save`, { method: "POST", token }),

    // Optimistic — flip the saved flag instantly in the feed cache
    onMutate: async (postId: string) => {
      await queryClient.cancelQueries({ queryKey: ["community-posts"] });
      const previous = queryClient.getQueryData<CommunityPost[]>(["community-posts"]);

      queryClient.setQueryData<CommunityPost[]>(["community-posts"], (old) =>
        old?.map((p) => (p.id === postId ? { ...p, viewerHasSaved: !p.viewerHasSaved } : p)),
      );

      return { previous };
    },

    onError: (_e, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["community-posts"], ctx.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
    },
  });
}
