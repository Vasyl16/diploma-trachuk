import { UserProfile } from "./user-profile";

type Props = { params: Promise<{ userId: string }> };

export default async function UserProfilePage({ params }: Props) {
  const { userId } = await params;
  return <UserProfile key={userId} userId={userId} />;
}
