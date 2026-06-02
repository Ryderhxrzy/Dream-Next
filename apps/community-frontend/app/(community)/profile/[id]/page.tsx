import { ProfileView } from "@/components/community/profile/ProfileView"

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ProfileView userId={id} />
}
