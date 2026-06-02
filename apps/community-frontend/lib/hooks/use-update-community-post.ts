import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type UpdatePostInput = {
  category: string;
  title: string;
  content: string;
  eventDate?: Date | null;
  eventTime?: string | null;
  eventEndTime?: string | null;
  location?: string | null;
  price?: string | null;
  condition?: string | null;
};

export function useUpdateCommunityPost(postId: string) {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: (input: UpdatePostInput) =>
      api(`/posts/${postId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          ...input,
          eventDate: input.eventDate ?? null,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });
}
