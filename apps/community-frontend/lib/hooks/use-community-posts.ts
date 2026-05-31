import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

export type CommunityPostCategory =
  | "GENERAL"
  | "QUESTION"
  | "EVENT"
  | "FOR_SALE"
  | "SAFETY"
  | "FREE";

export type CommunityPost = {
  id: string;
  authorId: string;
  category: CommunityPostCategory;
  title: string;
  content: string;
  imageUrl: string | null;
  eventDate: string | null;
  eventTime: string | null;
  location: string | null;
  price: string | null;
  condition: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    avatarUrl: string | null;
  };
  counts: {
    comments: number;
    reactions: number;
  };
};

export function useCommunityPosts() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ["community-posts"],
    queryFn: () => api<CommunityPost[]>("/posts", { token }),
  });
}
