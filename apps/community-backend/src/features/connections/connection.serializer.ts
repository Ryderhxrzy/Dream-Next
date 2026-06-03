type ConnectionUser = {
  id: bigint;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  profile?: { location: string | null } | null;
};

export function serializeConnectionUser(u: ConnectionUser) {
  return {
    id: u.id.toString(),
    name: [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || "Community Member",
    avatarUrl: u.avatarUrl,
    location: u.profile?.location ?? null,
  };
}
