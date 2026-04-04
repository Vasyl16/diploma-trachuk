import { Suspense } from "react";

import { ProfileRecipes } from "./profile-recipes";

function ProfileFallback() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileFallback />}>
      <ProfileRecipes />
    </Suspense>
  );
}
