import { cn } from "@/lib/utils";

type AlertMessageProps = {
  children: React.ReactNode;
  variant?: "destructive" | "muted" | "success";
  className?: string;
};

export function AlertMessage({
  children,
  variant = "destructive",
  className,
}: AlertMessageProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        variant === "destructive" &&
          "border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/50 dark:bg-destructive/15",
        variant === "muted" &&
          "border-border bg-muted/50 text-muted-foreground",
        variant === "success" &&
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100",
        className,
      )}
    >
      {children}
    </div>
  );
}
