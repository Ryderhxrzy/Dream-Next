import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type CurrentUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  avatarUrl: string | null;
};

export function useCurrentUser() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ["current-user", token],
    queryFn: () => api<CurrentUser>("/me", { token }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

export function getFullName(user: { firstName: string | null; lastName: string | null } | undefined) {
  if (!user) return "";
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "User";
}

export function getInitials(user: { firstName: string | null; lastName: string | null } | undefined) {
  if (!user) return "?";
  const first = user.firstName?.[0] ?? "";
  const last = user.lastName?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}
