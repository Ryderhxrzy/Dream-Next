import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import type { CommunityPost } from "@/lib/hooks/use-community-posts";

type RsvpStatus = "GOING" | "INTERESTED";
type RsvpResult = { status: RsvpStatus | null; going: number; interested: number };

export function useSetRsvp() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: ({ postId, status }: { postId: string; status: RsvpStatus }) =>
      api<RsvpResult>(`/posts/${postId}/rsvp`, {
        method: "POST",
        token,
        body: JSON.stringify({ status }),
      }),

    onMutate: async ({ postId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["community-posts"] });
      const previous = queryClient.getQueryData<CommunityPost[]>(["community-posts"]);

      queryClient.setQueryData<CommunityPost[]>(["community-posts"], (old) =>
        old?.map((post) => {
          if (post.id !== postId) return post;

          const prev = post.viewerRsvp;
          // Clicking the same status removes it; otherwise switch
          const next = prev === status ? null : status;

          let going = post.counts.going;
          let interested = post.counts.interested;

          // Remove old status count
          if (prev === "GOING") going -= 1;
          if (prev === "INTERESTED") interested -= 1;
          // Add new status count
          if (next === "GOING") going += 1;
          if (next === "INTERESTED") interested += 1;

          return {
            ...post,
            viewerRsvp: next,
            counts: { ...post.counts, going, interested },
          };
        }),
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["community-posts"], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });
}
