import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

export type CommunityProfile = {
  bio: string | null;
  location: string | null;
  coverUrl: string | null;
  occupation: string | null;
  role: string | null;
  interests: string[];
};

export type MyProfile = CommunityProfile & { connectionCount: number };

/** Current user's community profile (bio, location, cover, interests, connection count). */
export function useMyProfile() {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["my-profile", token],
    queryFn: () => api<MyProfile>("/profile", { token }),
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

/**
 * Update the profile. NOTE: this replaces all fields — always pass the full
 * profile object (merge current values with your changes) to avoid wiping data.
 */
export function useUpdateProfile() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CommunityProfile) =>
      api<CommunityProfile>("/profile", {
        method: "PATCH",
        token,
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["my-profile", token], data);
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

/** Upload an image to Cloudinary (reuses the posts image endpoint). */
export function useUploadProfileImage() {
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      return api<{ imageUrl: string; publicId: string }>("/posts/images", {
        method: "POST",
        token,
        body: formData,
      });
    },
  });
}
