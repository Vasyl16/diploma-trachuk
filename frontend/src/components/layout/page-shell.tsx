import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageShellProps = {
  children: ReactNode;
  className?: string;
  /** Subtle page background (e.g. gradient hero). */
  variant?: "default" | "gradient";
  /** Use a wider max width for grids (e.g. profile). */
  wide?: boolean;
};

export function PageShell({
  children,
  className,
  variant = "default",
  wide = false,
}: PageShellProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col",
        variant === "gradient" &&
          "bg-gradient-to-b from-violet-50/90 via-background to-background dark:from-violet-950/25 dark:via-background dark:to-background",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full flex-1 flex-col gap-10 px-4 py-10 sm:px-6",
          wide ? "max-w-5xl" : "max-w-2xl",
        )}
      >
        {children}
      </div>
    </div>
  );
}
