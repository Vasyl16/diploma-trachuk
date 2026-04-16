"use client";

import Link from "next/link";
import { Bookmark, Heart } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RecipeAiBadges } from "@/components/recipe/recipe-ai-badges";
import { RecipeCardMedia } from "@/components/recipe/recipe-media";
import { cn } from "@/lib/utils";
import type { FeedRecipe } from "@/types/recipe";

function previewIngredients(ingredients: string[]): string {
  if (!ingredients.length) return "—";
  const line = ingredients.slice(0, 5).join(", ");
  return line.length > 120 ? `${line.slice(0, 119)}…` : line;
}

export type RecipeFeedCardProps = {
  recipe: FeedRecipe;
  /** When set and matches `recipe.userId`, author links to `/profile` instead of `/users/...`. */
  currentUserId?: string | null;
  onToggleLike: () => void;
  onToggleSave: () => void;
  togglingLike: boolean;
  togglingSave: boolean;
  isSignedIn: boolean;
  onRequireSignIn: () => void;
};

export function RecipeFeedCard({
  recipe,
  currentUserId,
  onToggleLike,
  onToggleSave,
  togglingLike,
  togglingSave,
  isSignedIn,
  onRequireSignIn,
}: RecipeFeedCardProps) {
  const authorHref =
    currentUserId && recipe.userId === currentUserId
      ? "/profile"
      : `/users/${recipe.userId}`;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <RecipeCardMedia
        imageUrl={recipe.imageUrl}
        title={recipe.title}
        recipeId={recipe.id}
      />
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-lg leading-snug">
            <Link
              href={`/recipes/${recipe.id}`}
              className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {recipe.title}
            </Link>
          </CardTitle>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            {recipe.isAI ? <RecipeAiBadges /> : null}
            {recipe.category ? (
              <Badge variant="secondary" className="max-w-[10rem] truncate">
                {recipe.category}
              </Badge>
            ) : null}
          </div>
        </div>
        {(recipe.tags?.length ?? 0) > 0 ? (
          <div className="flex flex-wrap gap-1">
            {(recipe.tags ?? []).slice(0, 6).map((t) => (
              <Badge
                key={t}
                variant="outline"
                className="text-[10px] font-normal leading-tight"
              >
                #{t}
              </Badge>
            ))}
            {(recipe.tags ?? []).length > 6 ? (
              <span className="text-[10px] text-muted-foreground">
                +{(recipe.tags ?? []).length - 6}
              </span>
            ) : null}
          </div>
        ) : null}
        <Link
          href={authorHref}
          className="flex w-fit max-w-full items-center gap-2 rounded-md text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {recipe.user.avatarUrl ? (
            <img
              src={recipe.user.avatarUrl}
              alt=""
              className="size-8 shrink-0 rounded-full border border-border object-cover"
              width={32}
              height={32}
            />
          ) : (
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-medium text-muted-foreground"
              aria-hidden
            >
              {recipe.user.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span>{recipe.user.name}</span>
        </Link>
        <CardDescription className="line-clamp-3">
          {previewIngredients(recipe.ingredients)}
        </CardDescription>
      </CardHeader>
      <div className="mt-auto flex flex-wrap items-center gap-4 border-t border-border px-6 py-3">
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            recipe.likedByMe && "text-red-600",
          )}
          aria-pressed={recipe.likedByMe}
          aria-label={recipe.likedByMe ? "Unlike" : "Like"}
          disabled={togglingLike}
          onClick={() =>
            isSignedIn ? onToggleLike() : onRequireSignIn()
          }
          title={
            isSignedIn
              ? recipe.likedByMe
                ? "Unlike"
                : "Like"
              : "Sign in to like"
          }
        >
          <Heart
            className={cn(
              "h-5 w-5 shrink-0",
              recipe.likedByMe && "fill-red-500 text-red-500",
            )}
            aria-hidden
          />
          <span>{recipe.likesCount}</span>
        </button>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            recipe.savedByMe && "text-foreground",
          )}
          aria-pressed={recipe.savedByMe}
          aria-label={recipe.savedByMe ? "Remove from saved" : "Save"}
          disabled={togglingSave}
          onClick={() =>
            isSignedIn ? onToggleSave() : onRequireSignIn()
          }
          title={
            isSignedIn
              ? recipe.savedByMe
                ? "Remove from saved"
                : "Save"
              : "Sign in to save"
          }
        >
          <Bookmark
            className={cn(
              "h-5 w-5 shrink-0",
              recipe.savedByMe && "fill-foreground text-foreground",
            )}
            aria-hidden
          />
        </button>
      </div>
    </Card>
  );
}
