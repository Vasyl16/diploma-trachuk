import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  /** Small label above the title (e.g. badge + icon). */
  eyebrow?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  eyebrow,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {eyebrow}
      <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}
