import type { CommunityPost } from "@/lib/hooks/use-community-posts";

export function eventDateOf(e: CommunityPost) {
  return e.eventDate ? new Date(e.eventDate) : new Date(e.createdAt);
}

/** Convert a 24-hour "HH:MM" string to 12-hour "h:mm AM/PM". */
export function to12h(time?: string | null): string | null {
  if (!time) return null;
  const [h, m] = time.split(":");
  const hNum = parseInt(h, 10);
  if (Number.isNaN(hNum)) return time;
  const period = hNum >= 12 ? "PM" : "AM";
  const h12 = hNum % 12 === 0 ? 12 : hNum % 12;
  return `${h12}:${(m ?? "00").padStart(2, "0")} ${period}`;
}

/** Build a display range like "2:00 PM – 3:00 PM" (falls back to start only). */
export function formatEventTimeRange(
  start?: string | null,
  end?: string | null,
): string | null {
  const s = to12h(start);
  const e = to12h(end);
  if (s && e) return `${s} – ${e}`;
  return s;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
