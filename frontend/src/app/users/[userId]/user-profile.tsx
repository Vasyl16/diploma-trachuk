"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { PageHeader, PageShell } from "@/components/layout";
import { RecipeFeedCard } from "@/components/recipe/recipe-feed-card";
import { PremiumBadge } from "@/components/user/premium-badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { getApiBaseUrl } from "@/lib/api-config";
import { fetchWithAuth } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";
import type { FeedRecipe } from "@/types/recipe";

type PublicUser = {
  id: string;
  name: string;
  avatarUrl: string | null;
  isPremium: boolean;
};

type MessageRelationshipStatus = {
  blockedByMe: boolean;
  blockedMe: boolean;
};

function normalizeFeedItem(raw: FeedRecipe): FeedRecipe {
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
      isPremium: Boolean(raw.user?.isPremium),
    },
  };
}

export function UserProfile({ userId }: { userId: string }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [recipes, setRecipes] = useState<FeedRecipe[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [togglingLikeId, setTogglingLikeId] = useState<string | null>(null);
  const [togglingSaveId, setTogglingSaveId] = useState<string | null>(null);
  const [myDbUserId, setMyDbUserId] = useState<string | null>(null);
  const [messageStatus, setMessageStatus] = useState<MessageRelationshipStatus | null>(
    null,
  );
  const [blocking, setBlocking] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const base = getApiBaseUrl();
      const [uRes, rRes] = await Promise.all([
        fetch(`${base}/users/public/${encodeURIComponent(userId)}`, {
          method: "GET",
          cache: "no-store",
        }),
        isSignedIn
          ? fetchWithAuth(
              `${base}/recipes/user/${encodeURIComponent(userId)}`,
              { method: "GET" },
              getToken,
            )
          : fetch(
              `${base}/recipes/user/${encodeURIComponent(userId)}`,
              { method: "GET", cache: "no-store" },
            ),
      ]);
      const uData: unknown = await uRes.json().catch(() => null);
      if (!uRes.ok) {
        setError("User not found.");
        setProfile(null);
        setRecipes([]);
        return;
      }
      const p = uData as PublicUser;
      setProfile({
        id: String(p.id),
        name: String(p.name ?? ""),
        avatarUrl:
          p.avatarUrl === null || p.avatarUrl === undefined
            ? null
            : String(p.avatarUrl),
        isPremium: Boolean(p.isPremium),
      });

      const rData: unknown = await rRes.json().catch(() => null);
      if (!rRes.ok) {
        setRecipes([]);
        return;
      }
      const list = Array.isArray(rData) ? rData : [];
      setRecipes(list.map((item) => normalizeFeedItem(item as FeedRecipe)));
    } catch {
      setError("Network error. Is the API running?");
      setProfile(null);
      setRecipes([]);
    }
  }, [getToken, isSignedIn, userId]);

  useEffect(() => {
    if (!isLoaded) return;
    void load();
  }, [isLoaded, load]);

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

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !myDbUserId || myDbUserId === userId) {
      setMessageStatus(null);
      return;
    }
    void (async () => {
      try {
        const res = await fetchWithAuth(
          `${getApiBaseUrl()}/messages/users/${encodeURIComponent(userId)}/status`,
          { method: "GET" },
          getToken,
        );
        const data = (await res.json().catch(() => null)) as
          | MessageRelationshipStatus
          | null;
        if (res.ok && data) {
          setMessageStatus({
            blockedByMe: Boolean(data.blockedByMe),
            blockedMe: Boolean(data.blockedMe),
          });
        } else {
          setMessageStatus({ blockedByMe: false, blockedMe: false });
        }
      } catch {
        setMessageStatus({ blockedByMe: false, blockedMe: false });
      }
    })();
  }, [getToken, isLoaded, isSignedIn, myDbUserId, userId]);

  async function toggleBlock(shouldBlock: boolean) {
    setBlocking(true);
    try {
      const res = await fetchWithAuth(
        `${getApiBaseUrl()}/messages/users/${encodeURIComponent(userId)}/block`,
        { method: shouldBlock ? "POST" : "DELETE" },
        getToken,
      );
      const data = (await res.json().catch(() => null)) as
        | MessageRelationshipStatus
        | null;
      if (res.ok && data) {
        setMessageStatus({
          blockedByMe: Boolean(data.blockedByMe),
          blockedMe: Boolean(data.blockedMe),
        });
      }
    } finally {
      setBlocking(false);
    }
  }

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
                  likesCount: Math.max(
                    0,
                    r.likesCount + (nextLiked ? 1 : -1),
                  ),
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
      const data = (await res.json().catch(() => null)) as {
        likesCount: number;
        likedByMe: boolean;
      } | null;
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
                ? {
                    ...r,
                    likedByMe: wasLiked,
                    likesCount: prevCount,
                  }
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
      const data = (await res.json().catch(() => null)) as {
        savedByMe: boolean;
      } | null;
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

  const isMe = Boolean(myDbUserId && myDbUserId === userId);
  const loading = !error && profile === null;

  return (
    <PageShell wide>
      <div className="space-y-2">
        <Link
          href="/feed"
          className="inline-flex text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Feed
        </Link>
        {isMe ? (
          <Link
            href="/profile"
            className="ml-4 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            My profile
          </Link>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <PageHeader
            title={profile?.name ?? "Profile"}
            description="Published recipes"
          />
          <div className="flex flex-wrap items-center gap-4 border-b border-border pb-8">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt=""
                className="size-20 rounded-full border border-border object-cover"
                width={80}
                height={80}
              />
            ) : (
              <div
                className="flex size-20 items-center justify-center rounded-full border border-border bg-muted text-2xl font-semibold text-muted-foreground"
                aria-hidden
              >
                {(profile?.name ?? "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold tracking-tight">
                {profile?.name ?? "Profile"}
              </h2>
              {profile?.isPremium ? <PremiumBadge /> : null}
              {!isMe && !messageStatus?.blockedByMe && !messageStatus?.blockedMe ? (
                <Link
                  href={isSignedIn ? `/messages?with=${userId}` : "/sign-in"}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "gap-2",
                  )}
                >
                  <Send className="size-4" aria-hidden />
                  Message
                </Link>
              ) : null}
              {!isMe && isSignedIn ? (
                <button
                  type="button"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "gap-2",
                  )}
                  disabled={blocking}
                  onClick={() => void toggleBlock(!messageStatus?.blockedByMe)}
                >
                  {blocking
                    ? "Updating…"
                    : messageStatus?.blockedByMe
                      ? "Unblock"
                      : "Block"}
                </button>
              ) : null}
              {!isMe && messageStatus?.blockedMe ? (
                <span className="text-xs text-amber-700 dark:text-amber-300">
                  This user blocked you
                </span>
              ) : null}
            </div>
          </div>

          {(recipes ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center text-muted-foreground">
              No published recipes yet.
            </div>
          ) : (
            <ul className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(recipes ?? []).map((recipe) => (
                <li key={recipe.id}>
                  <RecipeFeedCard
                    recipe={recipe}
                    currentUserId={myDbUserId}
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
          )}
        </>
      )}
    </PageShell>
  );
}
