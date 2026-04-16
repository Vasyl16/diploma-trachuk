"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { PageHeader, PageShell } from "@/components/layout";
import {
  RecipeManualForm,
  type RecipeManualFormValues,
} from "@/components/recipe/recipe-manual-form";
import { getApiBaseUrl } from "@/lib/api-config";
import { parseApiErrorMessage } from "@/lib/api-error";
import { fetchWithAuth } from "@/lib/api-fetch";
import { fileToDataUrl } from "@/lib/recipe-image-upload";

type RecipePayload = {
  id: string;
  title: string;
  ingredients: string[];
  steps: string[];
  category?: string | null;
  tags?: string[];
  userId: string;
};

export default function EditRecipePage() {
  const params = useParams();
  const recipeId = typeof params.recipeId === "string" ? params.recipeId : "";
  const router = useRouter();
  const { getToken, isLoaded } = useAuth();
  const [recipe, setRecipe] = useState<RecipePayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    void (async () => {
      try {
        const me = await fetchWithAuth(
          `${getApiBaseUrl()}/users/me`,
          { method: "GET" },
          getToken,
        );
        const u = (await me.json().catch(() => null)) as { id?: string } | null;
        if (me.ok && u?.id) setMyId(u.id);
        else setMyId(null);
      } catch {
        setMyId(null);
      }
    })();
  }, [getToken, isLoaded]);

  const load = useCallback(async () => {
    if (!recipeId) return;
    setLoadError(null);
    try {
      const res = await fetchWithAuth(
        `${getApiBaseUrl()}/recipes/${encodeURIComponent(recipeId)}`,
        { method: "GET" },
        getToken,
      );
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setLoadError(
          parseApiErrorMessage(
            data,
            res.status === 403
              ? "You can’t edit this recipe."
              : "Recipe not found.",
          ),
        );
        setRecipe(null);
        return;
      }
      const o = data as Record<string, unknown>;
      setRecipe({
        id: String(o.id ?? ""),
        title: String(o.title ?? ""),
        ingredients: Array.isArray(o.ingredients)
          ? (o.ingredients as string[])
          : [],
        steps: Array.isArray(o.steps) ? (o.steps as string[]) : [],
        category:
          o.category === null || o.category === undefined
            ? null
            : String(o.category),
        tags: Array.isArray(o.tags) ? (o.tags as string[]) : [],
        userId: String(o.userId ?? ""),
      });
    } catch {
      setLoadError("Network error.");
      setRecipe(null);
    }
  }, [getToken, recipeId]);

  useEffect(() => {
    if (!isLoaded || !recipeId) return;
    void load();
  }, [isLoaded, load, recipeId]);

  async function handleSubmit(
    values: RecipeManualFormValues,
    imageFile: File | null,
  ) {
    if (!isLoaded || !recipeId) throw new Error("Not ready.");
    const res = await fetchWithAuth(
      `${getApiBaseUrl()}/recipes/${encodeURIComponent(recipeId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          title: values.title,
          ingredients: values.ingredients,
          steps: values.steps,
          category: values.category.trim(),
          tags: values.tags,
        }),
      },
      getToken,
    );
    const body: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        parseApiErrorMessage(body, "Could not update recipe."),
      );
    }
    if (imageFile) {
      const dataUrl = await fileToDataUrl(imageFile);
      const up = await fetchWithAuth(
        `${getApiBaseUrl()}/recipes/${encodeURIComponent(recipeId)}/dish-image`,
        {
          method: "POST",
          body: JSON.stringify({ imageBase64: dataUrl }),
        },
        getToken,
      );
      if (!up.ok) {
        const errBody: unknown = await up.json().catch(() => ({}));
        throw new Error(
          parseApiErrorMessage(errBody, "Saved text but image upload failed."),
        );
      }
    }
    router.push(`/recipes/${encodeURIComponent(recipeId)}`);
  }

  if (!isLoaded || recipe === null) {
    return (
      <PageShell variant="gradient">
        <PageHeader title="Edit recipe" />
        {loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        <Link
          href="/profile?tab=recipes"
          className="mt-4 inline-block text-sm font-medium text-primary"
        >
          Back to profile
        </Link>
      </PageShell>
    );
  }

  if (myId && recipe.userId !== myId) {
    return (
      <PageShell variant="gradient">
        <PageHeader title="Edit recipe" />
        <p className="text-sm text-destructive">You can only edit your own recipes.</p>
        <Link href={`/recipes/${recipe.id}`} className="mt-4 inline-block text-sm font-medium text-primary">
          View recipe
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell variant="gradient">
      <PageHeader
        title="Edit recipe"
        description="Update ingredients, steps, and optionally replace the dish image."
      />
      <RecipeManualForm
        submitLabel="Save changes"
        defaultTitle={recipe.title}
        defaultIngredientsText={recipe.ingredients.join("\n")}
        defaultStepsText={recipe.steps.join("\n")}
        defaultCategory={recipe.category ?? ""}
        defaultTagsText={(recipe.tags ?? []).join(", ")}
        onSubmit={handleSubmit}
      />
    </PageShell>
  );
}
