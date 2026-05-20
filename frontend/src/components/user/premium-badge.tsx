import { Crown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PremiumBadgeProps = {
  className?: string;
};

export function PremiumBadge({ className }: PremiumBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "inline-flex items-center gap-1 border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/80 dark:bg-amber-950/40 dark:text-amber-100",
        className,
      )}
    >
      <Crown className="size-3.5" aria-hidden />
      Premium
    </Badge>
  );
}
