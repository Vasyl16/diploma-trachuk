import { Suspense } from "react";

import { MessagesClient } from "./messages-client";

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <p className="px-4 py-8 text-sm text-muted-foreground sm:px-6">
          Loading…
        </p>
      }
    >
      <MessagesClient />
    </Suspense>
  );
}
