import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";

import { cn } from "@/lib/utils";

type RecipeCardMediaProps = {
  imageUrl?: string | null;
  title: string;
  recipeId: string;
  /** When true, the media area links to the recipe page. Default true. */
  linkToRecipe?: boolean;
  className?: string;
};

/** 4:3 thumbnail for feed and profile grids — always reserves space; placeholder if no URL. */
export function RecipeCardMedia({
  imageUrl,
  title,
  recipeId,
  linkToRecipe = true,
  className,
}: RecipeCardMediaProps) {
  const hasImage = Boolean(imageUrl?.trim());

  const inner = (
    <div
      className={cn(
        "relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-muted",
        className,
      )}
    >
      {hasImage ? (
        <img
          src={imageUrl!}
          alt=""
          className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
        />
      ) : (
        <div
          className="flex h-full min-h-[120px] w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-muted to-muted/70 px-4 text-center text-muted-foreground"
          aria-hidden
        >
          <UtensilsCrossed className="size-11 opacity-45" strokeWidth={1.25} />
          <span className="text-xs font-medium">No photo</span>
        </div>
      )}
    </div>
  );

  if (linkToRecipe) {
    return (
      <Link
        href={`/recipes/${recipeId}`}
        className={cn(
          "group block shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
        aria-label={`View recipe: ${title}`}
      >
        {inner}
      </Link>
    );
  }

  return inner;
}

type RecipeHeroMediaProps = {
  imageUrl?: string | null;
  title: string;
  className?: string;
};

/** Wide hero on recipe detail — always shown with placeholder when missing. */
export function RecipeHeroMedia({
  imageUrl,
  title,
  className,
}: RecipeHeroMediaProps) {
  const hasImage = Boolean(imageUrl?.trim());

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-muted",
        className,
      )}
    >
      {hasImage ? (
        <img
          src={imageUrl!}
          alt=""
          className="aspect-[16/9] w-full object-cover sm:aspect-[2/1]"
        />
      ) : (
        <div
          className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-muted to-muted/70 px-6 py-10 text-muted-foreground sm:aspect-[2/1]"
          role="img"
          aria-label={`No photo for ${title}`}
        >
          <UtensilsCrossed className="size-16 opacity-40" strokeWidth={1.25} />
          <span className="text-sm font-medium">No dish photo</span>
        </div>
      )}
    </div>
  );
}
