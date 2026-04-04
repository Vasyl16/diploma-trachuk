"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { RecipeFeedCard } from "@/components/recipe/recipe-feed-card";
import { getApiBaseUrl } from "@/lib/api-config";
import { parseApiErrorMessage } from "@/lib/api-error";
import { fetchWithAuth } from "@/lib/api-fetch";
import type { FeedRecipe } from "@/types/recipe";

type LikeResponse = { likesCount: number; likedByMe: boolean };
type SaveResponse = { savedByMe: boolean };

function normalize(raw: FeedRecipe): FeedRecipe {
  return {
    ...raw,
    imageUrl:
      raw.imageUrl === null || raw.imageUrl === undefined
        ? null
        : String(raw.imageUrl),
    likesCount: typeof raw.likesCount === "number" ? raw.likesCount : 0,
    likedByMe: Boolean(raw.likedByMe),
    savedByMe: Boolean(raw.savedByMe),
    user: {
      name: raw.user?.name ?? "",
      avatarUrl: raw.user?.avatarUrl ?? null,
    },
  };
}

type ProfileFeedTabProps = {
  /** DB user id — author links to `/profile` when the recipe is yours. */
  currentUserId?: string | null;
};

export function ProfileSavedRecipes({ currentUserId }: ProfileFeedTabProps) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [recipes, setRecipes] = useState<FeedRecipe[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [togglingLikeId, setTogglingLikeId] = useState<string | null>(null);
  const [togglingSaveId, setTogglingSaveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchWithAuth(
        `${getApiBaseUrl()}/recipes/favorites`,
        { method: "GET" },
        getToken,
      );
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = parseApiErrorMessage(
          data,
          res.status === 401 ? "Sign in required." : "Could not load saved recipes.",
        );
        if (res.status === 401) {
          setError(msg);
        } else if (msg.includes("Recipe with id favorites")) {
          setError(null);
        } else {
          setError(msg);
        }
        setRecipes([]);
        return;
      }
      const list = Array.isArray(data) ? data : [];
      setRecipes(list.map((item) => normalize(item as FeedRecipe)));
    } catch {
      setError("Network error. Is the API running?");
      setRecipes([]);
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    void load();
  }, [isLoaded, load]);

  async function toggleLike(recipe: FeedRecipe) {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    if (togglingLikeId === recipe.id) return;
    const wasLiked = recipe.likedByMe;
    const nextLiked = !wasLiked;
    const prevCount = recipe.likesCount;
    setTogglingLikeId(recipe.id);
    setRecipes((prev) =>
      prev
        ? prev.map((r) =>
            r.id === recipe.id
              ? {
                  ...r,
                  likedByMe: nextLiked,
                  likesCount: Math.max(0, r.likesCount + (nextLiked ? 1 : -1)),
                }
              : r,
          )
        : prev,
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
        setRecipes((prev) =>
          prev
            ? prev.map((r) =>
                r.id === recipe.id
                  ? {
                      ...r,
                      likesCount: data.likesCount,
                      likedByMe: data.likedByMe,
                    }
                  : r,
              )
            : prev,
        );
      }
    } catch {
      setRecipes((prev) =>
        prev
          ? prev.map((r) =>
              r.id === recipe.id
                ? { ...r, likedByMe: wasLiked, likesCount: prevCount }
                : r,
            )
          : prev,
      );
    } finally {
      setTogglingLikeId(null);
    }
  }

  async function toggleSave(recipe: FeedRecipe) {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    if (togglingSaveId === recipe.id) return;
    const wasSaved = recipe.savedByMe;
    const nextSaved = !wasSaved;
    setTogglingSaveId(recipe.id);
    setRecipes((prev) =>
      prev
        ? prev.map((r) =>
            r.id === recipe.id ? { ...r, savedByMe: nextSaved } : r,
          )
        : prev,
    );
    try {
      const res = await fetchWithAuth(
        `${getApiBaseUrl()}/recipes/${recipe.id}/save`,
        { method: nextSaved ? "POST" : "DELETE" },
        getToken,
      );
      const data = (await res.json().catch(() => null)) as SaveResponse | null;
      if (!res.ok) throw new Error("save failed");
      if (data && typeof data.savedByMe === "boolean") {
        if (!data.savedByMe) {
          setRecipes((prev) =>
            prev ? prev.filter((r) => r.id !== recipe.id) : prev,
          );
        } else {
          setRecipes((prev) =>
            prev
              ? prev.map((r) =>
                  r.id === recipe.id ? { ...r, savedByMe: data.savedByMe } : r,
                )
              : prev,
          );
        }
      }
    } catch {
      setRecipes((prev) =>
        prev
          ? prev.map((r) =>
              r.id === recipe.id ? { ...r, savedByMe: wasSaved } : r,
            )
          : prev,
      );
    } finally {
      setTogglingSaveId(null);
    }
  }

  const loading = recipes === null;
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (recipes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center text-muted-foreground">
        Nothing saved yet. Use the bookmark on the feed to save recipes here.
      </div>
    );
  }

  return (
    <ul className="grid list-none gap-4 sm:grid-cols-2">
      {recipes.map((recipe) => (
        <li key={recipe.id}>
          <RecipeFeedCard
            recipe={recipe}
            currentUserId={currentUserId}
            isSignedIn={Boolean(isSignedIn)}
            onRequireSignIn={() => router.push("/sign-in")}
            togglingLike={togglingLikeId === recipe.id}
            togglingSave={togglingSaveId === recipe.id}
            onToggleLike={() => void toggleLike(recipe)}
            onToggleSave={() => void toggleSave(recipe)}
          />
        </li>
      ))}
    </ul>
  );
}

export function ProfileLikedRecipes({ currentUserId }: ProfileFeedTabProps) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [recipes, setRecipes] = useState<FeedRecipe[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [togglingLikeId, setTogglingLikeId] = useState<string | null>(null);
  const [togglingSaveId, setTogglingSaveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchWithAuth(
        `${getApiBaseUrl()}/recipes/liked`,
        { method: "GET" },
        getToken,
      );
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          parseApiErrorMessage(
            data,
            res.status === 401 ? "Sign in required." : "Could not load likes.",
          ),
        );
        setRecipes([]);
        return;
      }
      const list = Array.isArray(data) ? data : [];
      setRecipes(list.map((item) => normalize(item as FeedRecipe)));
    } catch {
      setError("Network error. Is the API running?");
      setRecipes([]);
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    void load();
  }, [isLoaded, load]);

  async function toggleLike(recipe: FeedRecipe) {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    if (togglingLikeId === recipe.id) return;
    const wasLiked = recipe.likedByMe;
    const nextLiked = !wasLiked;
    const prevCount = recipe.likesCount;
    setTogglingLikeId(recipe.id);
    setRecipes((prev) =>
      prev
        ? prev.map((r) =>
            r.id === recipe.id
              ? {
                  ...r,
                  likedByMe: nextLiked,
                  likesCount: Math.max(0, r.likesCount + (nextLiked ? 1 : -1)),
                }
              : r,
          )
        : prev,
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
        if (!data.likedByMe) {
          setRecipes((prev) =>
            prev ? prev.filter((r) => r.id !== recipe.id) : prev,
          );
        } else {
          setRecipes((prev) =>
            prev
              ? prev.map((r) =>
                  r.id === recipe.id
                    ? {
                        ...r,
                        likesCount: data.likesCount,
                        likedByMe: data.likedByMe,
                      }
                    : r,
                )
              : prev,
          );
        }
      }
    } catch {
      setRecipes((prev) =>
        prev
          ? prev.map((r) =>
              r.id === recipe.id
                ? { ...r, likedByMe: wasLiked, likesCount: prevCount }
                : r,
            )
          : prev,
      );
    } finally {
      setTogglingLikeId(null);
    }
  }

  async function toggleSave(recipe: FeedRecipe) {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    if (togglingSaveId === recipe.id) return;
    const wasSaved = recipe.savedByMe;
    const nextSaved = !wasSaved;
    setTogglingSaveId(recipe.id);
    setRecipes((prev) =>
      prev
        ? prev.map((r) =>
            r.id === recipe.id ? { ...r, savedByMe: nextSaved } : r,
          )
        : prev,
    );
    try {
      const res = await fetchWithAuth(
        `${getApiBaseUrl()}/recipes/${recipe.id}/save`,
        { method: nextSaved ? "POST" : "DELETE" },
        getToken,
      );
      const data = (await res.json().catch(() => null)) as SaveResponse | null;
      if (!res.ok) throw new Error("save failed");
      if (data && typeof data.savedByMe === "boolean") {
        setRecipes((prev) =>
          prev
            ? prev.map((r) =>
                r.id === recipe.id ? { ...r, savedByMe: data.savedByMe } : r,
              )
            : prev,
        );
      }
    } catch {
      setRecipes((prev) =>
        prev
          ? prev.map((r) =>
              r.id === recipe.id ? { ...r, savedByMe: wasSaved } : r,
            )
          : prev,
      );
    } finally {
      setTogglingSaveId(null);
    }
  }

  const loading = recipes === null;
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (recipes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center text-muted-foreground">
        No likes yet. Tap the heart on the feed to like recipes.
      </div>
    );
  }

  return (
    <ul className="grid list-none gap-4 sm:grid-cols-2">
      {recipes.map((recipe) => (
        <li key={recipe.id}>
          <RecipeFeedCard
            recipe={recipe}
            currentUserId={currentUserId}
            isSignedIn={Boolean(isSignedIn)}
            onRequireSignIn={() => router.push("/sign-in")}
            togglingLike={togglingLikeId === recipe.id}
            togglingSave={togglingSaveId === recipe.id}
            onToggleLike={() => void toggleLike(recipe)}
            onToggleSave={() => void toggleSave(recipe)}
          />
        </li>
      ))}
    </ul>
  );
}
