import type { CommunityPost } from "@/lib/hooks/use-community-posts";

export function eventDateOf(e: CommunityPost) {
  return e.eventDate ? new Date(e.eventDate) : new Date(e.createdAt);
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
