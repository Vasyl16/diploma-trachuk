"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type CustomMenuOption = {
  value: string;
  label: string;
};

type CustomMenuSelectProps = {
  id?: string;
  /** Current value; empty string = first option (e.g. “All …”). */
  value: string;
  onChange: (value: string) => void;
  options: CustomMenuOption[];
  /** Shown when no option matches (should not happen if options include empty). */
  placeholder?: string;
  /** Accessible name for the expanded listbox. */
  listboxAriaLabel?: string;
  className?: string;
};

export function CustomMenuSelect({
  id: idProp,
  value,
  onChange,
  options,
  placeholder = "Select…",
  listboxAriaLabel = "Options",
  className,
}: CustomMenuSelectProps) {
  const autoId = useId();
  const id = idProp ?? `menu-${autoId}`;
  const listId = `${id}-listbox`;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected?.label ?? placeholder;

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)}>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm shadow-sm",
          "ring-offset-background transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="min-w-0 truncate">{displayLabel}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={listboxAriaLabel}
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-60 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
        >
          <div className="max-h-56 overflow-y-auto py-1">
            {options.map((opt) => {
              const isSelected = value === opt.value;
              return (
                <li key={opt.value === "" ? "__all__" : opt.value} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      "flex w-full px-3 py-2 text-left text-sm transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted",
                    )}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                </li>
              );
            })}
          </div>
        </ul>
      ) : null}
    </div>
  );
}
