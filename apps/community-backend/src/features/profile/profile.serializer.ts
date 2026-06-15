import type { CommunityProfile } from "../../generated/prisma/client.js"

export function serializeProfile(profile: CommunityProfile | null) {
  return {
    bio: profile?.bio ?? null,
    location: profile?.location ?? null,
    coverUrl: profile?.coverUrl ?? null,
    occupation: profile?.occupation ?? null,
    role: profile?.role ?? null,
    interests: profile?.interests ?? [],
  }
}
