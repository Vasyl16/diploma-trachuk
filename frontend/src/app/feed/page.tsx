import { Suspense } from "react";

import { FeedList } from "./feed-list";

export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <p className="px-4 py-8 text-sm text-muted-foreground sm:px-6">
          Loading…
        </p>
      }
    >
      <FeedList />
    </Suspense>
  );
}
