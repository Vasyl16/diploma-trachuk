"use client";

import { useAuth } from "@clerk/nextjs";
import { Camera, Globe, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { PageHeader, PageShell } from "@/components/layout";
import { RecipeAiBadges } from "@/components/recipe/recipe-ai-badges";
import { RecipeCardMedia } from "@/components/recipe/recipe-media";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getApiBaseUrl } from "@/lib/api-config";
import { fetchWithAuth } from "@/lib/api-fetch";
import { parseApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import type { Recipe } from "@/types/recipe";

import { ProfileLikedRecipes, ProfileSavedRecipes } from "./profile-social-grids";

type DbUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

function previewIngredients(ingredients: string[]): string {
  if (!ingredients.length) return "—";
  const line = ingredients.slice(0, 5).join(", ");
  return line.length > 120 ? `${line.slice(0, 119)}…` : line;
}

const tabs = [
  { id: "recipes", label: "My recipes" },
  { id: "saved", label: "Saved" },
  { id: "likes", label: "Likes" },
] as const;

export function ProfileRecipes() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") ?? "recipes";
  const activeTab = tabs.some((t) => t.id === tabParam)
    ? tabParam
    : "recipes";

  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [showSavedBanner, setShowSavedBanner] = useState(false);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [unpublishingId, setUnpublishingId] = useState<string | null>(null);
  const [unpublishError, setUnpublishError] = useState<string | null>(null);
  const [recipeImageNote, setRecipeImageNote] = useState<string | null>(null);

  useEffect(() => {
    try {
      const note = sessionStorage.getItem("recipeStudioRecipeImageNote");
      if (note) {
        setRecipeImageNote(note);
        sessionStorage.removeItem("recipeStudioRecipeImageNote");
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (searchParams.get("saved") === "1") {
      setShowSavedBanner(true);
      router.replace("/profile?tab=recipes", { scroll: false });
    }
  }, [searchParams, router]);

  const loadMe = useCallback(async () => {
    setAvatarError(null);
    try {
      const res = await fetchWithAuth(
        `${getApiBaseUrl()}/users/me`,
        { method: "GET" },
        getToken,
      );
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setDbUser(null);
        return;
      }
      if (
        typeof data === "object" &&
        data !== null &&
        "id" in data &&
        "email" in data
      ) {
        const u = data as DbUser;
        setDbUser(u);
      }
    } catch {
      setDbUser(null);
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void loadMe();
  }, [isLoaded, isSignedIn, loadMe]);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetchWithAuth(
        `${getApiBaseUrl()}/recipes/my`,
        { method: "GET" },
        getToken,
      );
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setLoadError(
          parseApiErrorMessage(
            data,
            res.status === 401 ? "Sign in required." : "Could not load recipes.",
          ),
        );
        setRecipes([]);
        return;
      }
      setRecipes(Array.isArray(data) ? (data as Recipe[]) : []);
    } catch {
      setLoadError("Network error. Is the API running?");
      setRecipes([]);
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded || activeTab !== "recipes") return;
    void load();
  }, [isLoaded, load, activeTab]);

  async function handlePublish(id: string) {
    setPublishError(null);
    setPublishingId(id);
    try {
      const res = await fetchWithAuth(
        `${getApiBaseUrl()}/recipes/${id}/publish`,
        { method: "PATCH" },
        getToken,
      );
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPublishError(
          parseApiErrorMessage(data, "Could not publish recipe."),
        );
        return;
      }
      setRecipes((prev) =>
        prev
          ? prev.map((r) =>
              r.id === id ? { ...r, isPublished: true } : r,
            )
          : prev,
      );
    } catch {
      setPublishError("Network error while publishing.");
    } finally {
      setPublishingId(null);
    }
  }

  async function handleUnpublish(id: string) {
    setUnpublishError(null);
    setUnpublishingId(id);
    try {
      const res = await fetchWithAuth(
        `${getApiBaseUrl()}/recipes/${id}/unpublish`,
        { method: "PATCH" },
        getToken,
      );
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUnpublishError(
          parseApiErrorMessage(data, "Could not unpublish recipe."),
        );
        return;
      }
      setRecipes((prev) =>
        prev
          ? prev.map((r) =>
              r.id === id ? { ...r, isPublished: false } : r,
            )
          : prev,
      );
    } catch {
      setUnpublishError("Network error while unpublishing.");
    } finally {
      setUnpublishingId(null);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarError(null);
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetchWithAuth(
        `${getApiBaseUrl()}/users/avatar`,
        { method: "POST", body: fd },
        getToken,
      );
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setAvatarError(
          parseApiErrorMessage(data, "Could not upload avatar."),
        );
        return;
      }
      if (
        typeof data === "object" &&
        data !== null &&
        "avatarUrl" in data
      ) {
        const u = data as DbUser;
        setDbUser((prev) =>
          prev
            ? { ...prev, avatarUrl: u.avatarUrl }
            : {
                id: u.id,
                name: u.name,
                email: u.email,
                avatarUrl: u.avatarUrl,
              },
        );
      }
    } catch {
      setAvatarError("Network error while uploading.");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteError(null);
    setDeletingId(id);
    try {
      const res = await fetchWithAuth(
        `${getApiBaseUrl()}/recipes/${id}`,
        { method: "DELETE" },
        getToken,
      );
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(
          parseApiErrorMessage(data, "Could not delete recipe."),
        );
        return;
      }
      setRecipes((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
    } catch {
      setDeleteError("Network error while deleting.");
    } finally {
      setDeletingId(null);
    }
  }

  const loadingMy =
    activeTab === "recipes" && (!isLoaded || recipes === null);

  return (
    <PageShell wide>
      <PageHeader
        title="Profile"
        description="Your recipes, saved posts, and likes — similar to Instagram."
      />

      {isSignedIn ? (
        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-border bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {dbUser?.avatarUrl ? (
              <img
                src={dbUser.avatarUrl}
                alt=""
                className="size-16 shrink-0 rounded-full border border-border object-cover"
                width={64}
                height={64}
              />
            ) : (
              <div
                className="flex size-16 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-lg font-semibold text-muted-foreground"
                aria-hidden
              >
                {dbUser?.name?.slice(0, 1).toUpperCase() ?? "?"}
              </div>
            )}
            <div>
              <p className="font-medium leading-tight">
                {dbUser?.name ?? "…"}
              </p>
              <p className="text-sm text-muted-foreground">
                {dbUser?.email ?? ""}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "cursor-pointer gap-2",
                avatarUploading && "pointer-events-none opacity-60",
              )}
            >
              <Camera className="size-4" aria-hidden />
              {avatarUploading ? "Uploading…" : "Change photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                disabled={avatarUploading}
                onChange={(e) => void handleAvatarChange(e)}
              />
            </label>
            {avatarError ? (
              <p className="text-xs text-destructive">{avatarError}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <nav
        className="mb-8 flex flex-wrap gap-1 border-b border-border"
        aria-label="Profile sections"
      >
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/profile?tab=${t.id}`}
            scroll={false}
            className={cn(
              "-mb-px border-b-2 border-transparent px-3 py-2.5 text-sm font-medium transition-colors",
              activeTab === t.id
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {activeTab === "recipes" ? (
        <>
          {showSavedBanner ? (
            <div
              className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
              role="status"
            >
              Recipe saved.
            </div>
          ) : null}

          {recipeImageNote ? (
            <div
              className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
              role="status"
            >
              {recipeImageNote}
            </div>
          ) : null}

          {loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : null}
          {deleteError ? (
            <p className="text-sm text-destructive">{deleteError}</p>
          ) : null}
          {publishError ? (
            <p className="text-sm text-destructive">{publishError}</p>
          ) : null}
          {unpublishError ? (
            <p className="text-sm text-destructive">{unpublishError}</p>
          ) : null}

          {loadingMy ? (
            <p className="text-sm text-muted-foreground">Loading recipes…</p>
          ) : recipes && recipes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
              <p className="text-muted-foreground">No recipes yet.</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Link href="/recipes/create" className={cn(buttonVariants())}>
                  Write a recipe
                </Link>
                <Link
                  href="/recipes/new"
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  AI generator
                </Link>
              </div>
            </div>
          ) : recipes ? (
            <ul className="grid list-none gap-4 sm:grid-cols-2">
              {recipes.map((recipe) => (
                <li key={recipe.id}>
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
                            className="hover:underline"
                          >
                            {recipe.title}
                          </Link>
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {recipe.isPublished ? (
                            <Badge variant="secondary">Published</Badge>
                          ) : null}
                          {recipe.isAI ? <RecipeAiBadges /> : null}
                        </div>
                      </div>
                      <CardDescription className="line-clamp-3">
                        {previewIngredients(recipe.ingredients)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto flex flex-wrap justify-end gap-2 pt-0">
                      <Link
                        href={`/recipes/${recipe.id}`}
                        className={cn(
                          buttonVariants({ variant: "secondary", size: "sm" }),
                        )}
                      >
                        View
                      </Link>
                      <Link
                        href={`/recipes/${recipe.id}/edit`}
                        className={cn(
                          buttonVariants({ variant: "secondary", size: "sm" }),
                        )}
                      >
                        Edit
                      </Link>
                      {!recipe.isPublished ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={publishingId === recipe.id}
                          onClick={() => void handlePublish(recipe.id)}
                        >
                          <Globe className="size-3.5" aria-hidden />
                          Publish
                        </Button>
                      ) : null}
                      {recipe.isPublished ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={unpublishingId === recipe.id}
                          onClick={() => void handleUnpublish(recipe.id)}
                        >
                          Unpublish
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={deletingId === recipe.id}
                        onClick={() => void handleDelete(recipe.id)}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        Delete
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      {activeTab === "saved" ? (
        <ProfileSavedRecipes currentUserId={dbUser?.id} />
      ) : null}
      {activeTab === "likes" ? (
        <ProfileLikedRecipes currentUserId={dbUser?.id} />
      ) : null}
    </PageShell>
  );
}
