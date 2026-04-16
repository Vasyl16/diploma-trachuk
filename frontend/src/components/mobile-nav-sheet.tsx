"use client";

import { X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export const MAIN_NAV_ITEMS = [
  { href: "/feed", label: "Feed" },
  { href: "/people", label: "People" },
  { href: "/profile", label: "Profile" },
  { href: "/recipes/create", label: "New recipe" },
  { href: "/recipes/new", label: "AI generator" },
] as const;

type MobileNavSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Extra actions shown at the bottom (e.g. Sign in / Sign up). */
  footer?: ReactNode;
};

export function MobileNavSheet({ open, onClose, footer }: MobileNavSheetProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      id="mobile-navigation-sheet"
      className="fixed inset-0 z-[100] flex justify-end md:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-200"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative flex h-full w-full max-w-sm flex-col border-l border-border bg-background shadow-2xl",
          "animate-in slide-in-from-right duration-300 ease-out",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <p id={titleId} className="text-base font-semibold tracking-tight">
            Menu
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="Close menu"
            onClick={onClose}
          >
            <X className="size-5" aria-hidden />
          </Button>
        </div>
        <nav
          className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-3"
          aria-label="Main navigation"
        >
          {MAIN_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                buttonVariants({ variant: "ghost", size: "lg" }),
                "h-11 w-full justify-start rounded-lg px-3 text-base font-medium",
              )}
              onClick={onClose}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {footer ? (
          <div className="border-t border-border bg-muted/20 p-4">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
