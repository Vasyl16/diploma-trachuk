"use client";

import { ChefHat, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Phase = "ingredients" | "steps" | "done";

type RecipeCookingModeProps = {
  open: boolean;
  onClose: () => void;
  recipeTitle: string;
  ingredients: string[];
  steps: string[];
};

export function RecipeCookingMode({
  open,
  onClose,
  recipeTitle,
  ingredients,
  steps,
}: RecipeCookingModeProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("ingredients");
  const [ingChecked, setIngChecked] = useState<Set<number>>(() => new Set());
  const [stepChecked, setStepChecked] = useState<Set<number>>(() => new Set());

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setPhase("ingredients");
    setIngChecked(new Set());
    setStepChecked(new Set());
  }, [open]);

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

  const ingList = useMemo(
    () => ingredients.filter((s) => s.trim().length > 0),
    [ingredients],
  );
  const stepList = useMemo(
    () => steps.filter((s) => s.trim().length > 0),
    [steps],
  );

  const allIngDone =
    ingList.length === 0 || ingChecked.size >= ingList.length;
  const allStepsDone =
    stepList.length === 0 || stepChecked.size >= stepList.length;

  const toggleIng = useCallback((i: number) => {
    setIngChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }, []);

  const toggleStep = useCallback((i: number) => {
    setStepChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }, []);

  const goToSteps = useCallback(() => {
    setPhase("steps");
  }, []);

  const markCooked = useCallback(() => {
    setPhase("done");
  }, []);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <ChefHat
            className="h-6 w-6 shrink-0 text-primary"
            aria-hidden
          />
          <div className="min-w-0">
            <p id={titleId} className="truncate text-base font-semibold">
              Cooking mode
            </p>
            <p className="truncate text-xs text-muted-foreground">{recipeTitle}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          aria-label="Exit cooking mode"
          onClick={handleClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        {phase === "ingredients" ? (
          <div className="mx-auto max-w-lg space-y-4">
            <p className="text-sm text-muted-foreground">
              Gather everything before you start.
            </p>
            {ingList.length ? (
              <ul className="space-y-2">
                {ingList.map((line, i) => (
                  <li key={`ing-${i}`}>
                    <label
                      className={cn(
                        "flex cursor-pointer gap-3 rounded-lg border border-border bg-card p-3 text-sm transition-colors",
                        ingChecked.has(i) && "border-primary/40 bg-primary/5",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={ingChecked.has(i)}
                        onChange={() => toggleIng(i)}
                        className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
                      />
                      <span
                        className={cn(
                          "leading-snug",
                          ingChecked.has(i) && "text-muted-foreground line-through",
                        )}
                      >
                        {line}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No ingredients listed for this recipe.
              </p>
            )}
            <Button
              type="button"
              className="w-full"
              disabled={!allIngDone}
              onClick={goToSteps}
            >
              Continue to steps
            </Button>
          </div>
        ) : null}

        {phase === "steps" ? (
          <div className="mx-auto max-w-lg space-y-4">
            <p className="text-sm text-muted-foreground">
              Work through each step, then mark when you are finished.
            </p>
            {stepList.length ? (
              <ol className="space-y-3">
                {stepList.map((line, i) => (
                  <li key={`step-${i}`} className="list-none">
                    <label
                      className={cn(
                        "flex cursor-pointer gap-3 rounded-lg border border-border bg-card p-3 text-sm transition-colors",
                        stepChecked.has(i) && "border-primary/40 bg-primary/5",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={stepChecked.has(i)}
                        onChange={() => toggleStep(i)}
                        className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
                      />
                      <span className="min-w-0">
                        <span className="font-medium text-foreground">
                          {i + 1}.{" "}
                        </span>
                        <span
                          className={cn(
                            "leading-snug",
                            stepChecked.has(i) &&
                              "text-muted-foreground line-through",
                          )}
                        >
                          {line}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">
                No steps listed for this recipe.
              </p>
            )}
            <Button
              type="button"
              className="w-full"
              disabled={!allStepsDone}
              onClick={markCooked}
            >
              Cooked
            </Button>
          </div>
        ) : null}

        {phase === "done" ? (
          <div className="mx-auto max-w-lg space-y-6 text-center">
            <ChefHat className="mx-auto h-14 w-14 text-primary" aria-hidden />
            <div className="space-y-2">
              <p className="font-heading text-xl font-semibold">
                Enjoy your meal
              </p>
              <p className="text-sm text-muted-foreground">
                You finished cooking this recipe.
              </p>
            </div>
            <Button type="button" className="w-full" onClick={handleClose}>
              Close
            </Button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
