"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Heart } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { PageHeader, PageShell } from "@/components/layout";
import { RecipeHeroMedia } from "@/components/recipe/recipe-media";
import { Badge } from "@/components/ui/badge";
import { parseApiErrorMessage } from "@/lib/api-error";
import { getApiBaseUrl } from "@/lib/api-config";
import { fetchWithAuth } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";
import type { FeedRecipe } from "@/types/recipe";

type LikeResponse = { likesCount: number; likedByMe: boolean };
type SaveResponse = { savedByMe: boolean };

function normalize(raw: unknown): FeedRecipe | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const user = o.user as Record<string, unknown> | undefined;
  return {
    id: String(o.id ?? ""),
    title: String(o.title ?? ""),
    ingredients: Array.isArray(o.ingredients)
      ? (o.ingredients as string[])
      : [],
    steps: Array.isArray(o.steps) ? (o.steps as string[]) : [],
    imageUrl:
      o.imageUrl === null || o.imageUrl === undefined
        ? null
        : String(o.imageUrl),
    isAI: Boolean(o.isAI),
    isPublished: Boolean(o.isPublished),
    userId: String(o.userId ?? ""),
    createdAt: String(o.createdAt ?? ""),
    updatedAt: String(o.updatedAt ?? ""),
    user: {
      name: String(user?.name ?? ""),
      avatarUrl:
        user?.avatarUrl === null || user?.avatarUrl === undefined
          ? null
          : String(user.avatarUrl),
    },
    likesCount: typeof o.likesCount === "number" ? o.likesCount : 0,
    likedByMe: Boolean(o.likedByMe),
    savedByMe: Boolean(o.savedByMe),
    category:
      o.category === null || o.category === undefined
        ? null
        : String(o.category),
    tags: Array.isArray(o.tags)
      ? (o.tags as unknown[]).map((t) => String(t))
      : [],
  };
}

export function RecipeDetail({ recipeId }: { recipeId: string }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [recipe, setRecipe] = useState<FeedRecipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [togglingLike, setTogglingLike] = useState(false);
  const [togglingSave, setTogglingSave] = useState(false);
  const [myDbUserId, setMyDbUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setMyDbUserId(null);
      return;
    }
    void (async () => {
      try {
        const res = await fetchWithAuth(
          `${getApiBaseUrl()}/users/me`,
          { method: "GET" },
          getToken,
        );
        const data = (await res.json().catch(() => null)) as { id?: string } | null;
        if (res.ok && data?.id) setMyDbUserId(data.id);
        else setMyDbUserId(null);
      } catch {
        setMyDbUserId(null);
      }
    })();
  }, [getToken, isLoaded, isSignedIn]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const url = `${getApiBaseUrl()}/recipes/${encodeURIComponent(recipeId)}`;
      const res = isSignedIn
        ? await fetchWithAuth(url, { method: "GET" }, getToken)
        : await fetch(url, { method: "GET", cache: "no-store" });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = parseApiErrorMessage(
          data,
          res.status === 403
            ? "This recipe is not published."
            : "Recipe not found.",
        );
        setError(msg);
        setRecipe(null);
        return;
      }
      const n = normalize(data);
      if (!n) {
        setError("Invalid recipe data.");
        setRecipe(null);
        return;
      }
      setRecipe(n);
    } catch {
      setError("Network error. Is the API running?");
      setRecipe(null);
    }
  }, [getToken, isSignedIn, recipeId]);

  useEffect(() => {
    setRecipe(null);
    setError(null);
  }, [recipeId]);

  useEffect(() => {
    if (!isLoaded) return;
    void load();
  }, [isLoaded, load]);

  async function toggleLike() {
    if (!recipe || !isSignedIn) {
      router.push("/sign-in");
      return;
    }
    if (togglingLike) return;
    const wasLiked = recipe.likedByMe;
    const nextLiked = !wasLiked;
    const prevCount = recipe.likesCount;
    setTogglingLike(true);
    setRecipe((r) =>
      r
        ? {
            ...r,
            likedByMe: nextLiked,
            likesCount: Math.max(0, r.likesCount + (nextLiked ? 1 : -1)),
          }
        : r,
    );
    try {
      const res = await fetchWithAuth(
        `${getApiBaseUrl()}/recipes/${recipe.id}/like`,
        { method: nextLiked ? "POST" : "DELETE" },
        getToken,
      );
      const data = (await res.json().catch(() => null)) as LikeResponse | null;
      if (!res.ok) throw new Error("toggle failed");
      if (
        data &&
        typeof data.likesCount === "number" &&
        typeof data.likedByMe === "boolean"
      ) {
        setRecipe((prev) =>
          prev
            ? {
                ...prev,
                likesCount: data.likesCount,
                likedByMe: data.likedByMe,
              }
            : prev,
        );
      }
    } catch {
      setRecipe((prev) =>
        prev
          ? {
              ...prev,
              likedByMe: wasLiked,
              likesCount: prevCount,
            }
          : prev,
      );
    } finally {
      setTogglingLike(false);
    }
  }

  async function toggleSave() {
    if (!recipe || !isSignedIn) {
      router.push("/sign-in");
      return;
    }
    if (togglingSave) return;
    const wasSaved = recipe.savedByMe;
    const nextSaved = !wasSaved;
    setTogglingSave(true);
    setRecipe((r) => (r ? { ...r, savedByMe: nextSaved } : r));
    try {
      const res = await fetchWithAuth(
        `${getApiBaseUrl()}/recipes/${recipe.id}/save`,
        { method: nextSaved ? "POST" : "DELETE" },
        getToken,
      );
      const data = (await res.json().catch(() => null)) as SaveResponse | null;
      if (!res.ok) throw new Error("save failed");
      if (data && typeof data.savedByMe === "boolean") {
        setRecipe((prev) =>
          prev ? { ...prev, savedByMe: data.savedByMe } : prev,
        );
      }
    } catch {
      setRecipe((prev) =>
        prev ? { ...prev, savedByMe: wasSaved } : prev,
      );
    } finally {
      setTogglingSave(false);
    }
  }

  if (!isLoaded || recipe === null) {
    if (error) {
      return (
        <PageShell wide>
          <PageHeader title="Recipe" />
          <p className="text-sm text-destructive">{error}</p>
          <Link
            href="/feed"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Back to feed
          </Link>
        </PageShell>
      );
    }
    return (
      <PageShell wide>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </PageShell>
    );
  }

  const authorHref =
    myDbUserId && recipe.userId === myDbUserId
      ? "/profile"
      : `/users/${recipe.userId}`;

  return (
    <PageShell wide>
      <div className="space-y-2">
        <Link
          href="/feed"
          className="inline-flex text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Feed
        </Link>
        <RecipeHeroMedia imageUrl={recipe.imageUrl} title={recipe.title} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h1 className="font-heading text-3xl font-bold tracking-tight">
              {recipe.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              {recipe.isAI ? <Badge variant="ai">AI</Badge> : null}
              {recipe.category ? (
                <Badge variant="secondary">{recipe.category}</Badge>
              ) : null}
              {(recipe.tags ?? []).map((t) => (
                <Badge key={t} variant="outline" className="font-normal">
                  #{t}
                </Badge>
              ))}
              <Link
                href={authorHref}
                className="inline-flex items-center gap-2 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {recipe.user.avatarUrl ? (
                  <img
                    src={recipe.user.avatarUrl}
                    alt=""
                    className="size-9 rounded-full border border-border object-cover"
                    width={36}
                    height={36}
                  />
                ) : (
                  <div
                    className="flex size-9 items-center justify-center rounded-full border border-border bg-muted text-xs font-medium text-muted-foreground"
                    aria-hidden
                  >
                    {recipe.user.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="font-medium">{recipe.user.name}</span>
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                recipe.likedByMe && "text-red-600",
              )}
              aria-pressed={recipe.likedByMe}
              disabled={togglingLike}
              onClick={() => void toggleLike()}
            >
              <Heart
                className={cn(
                  "h-6 w-6",
                  recipe.likedByMe && "fill-red-500 text-red-500",
                )}
              />
              <span>{recipe.likesCount}</span>
            </button>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                recipe.savedByMe && "text-foreground",
              )}
              aria-pressed={recipe.savedByMe}
              disabled={togglingSave}
              onClick={() => void toggleSave()}
            >
              <Bookmark
                className={cn(
                  "h-6 w-6",
                  recipe.savedByMe && "fill-foreground text-foreground",
                )}
              />
            </button>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Ingredients</h2>
        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
          {recipe.ingredients.length ? (
            recipe.ingredients.map((line) => (
              <li key={line}>{line}</li>
            ))
          ) : (
            <li>—</li>
          )}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Steps</h2>
        <ol className="list-inside list-decimal space-y-3 text-muted-foreground">
          {recipe.steps.length ? (
            recipe.steps.map((step, i) => (
              <li key={i} className="pl-1">
                {step}
              </li>
            ))
          ) : (
            <li>—</li>
          )}
        </ol>
      </section>
    </PageShell>
  );
}
