"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PageHeader, PageShell } from "@/components/layout";
import {
  RecipeManualForm,
  type RecipeManualFormValues,
} from "@/components/recipe/recipe-manual-form";
import { getApiBaseUrl } from "@/lib/api-config";
import { parseApiErrorMessage } from "@/lib/api-error";
import { fetchWithAuth } from "@/lib/api-fetch";
import { fileToDataUrl } from "@/lib/recipe-image-upload";

export default function CreateRecipePage() {
  const router = useRouter();
  const { getToken, isLoaded } = useAuth();

  async function handleSubmit(
    values: RecipeManualFormValues,
    imageFile: File | null,
  ) {
    if (!isLoaded) throw new Error("Not ready.");
    const res = await fetchWithAuth(
      `${getApiBaseUrl()}/recipes`,
      {
        method: "POST",
        body: JSON.stringify({
          title: values.title,
          ingredients: values.ingredients,
          steps: values.steps,
          isAI: false,
          category: values.category || undefined,
          tags: values.tags.length ? values.tags : undefined,
          diet: values.diet.trim() || undefined,
          restrictions: values.restrictions.length
            ? values.restrictions
            : undefined,
        }),
      },
      getToken,
    );
    const body: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        parseApiErrorMessage(
          body,
          res.status === 401 ? "Sign in required." : "Could not create recipe.",
        ),
      );
    }
    const recipe = body as { id?: string };
    if (!recipe.id) {
      throw new Error("Invalid response from server.");
    }
    if (imageFile) {
      const dataUrl = await fileToDataUrl(imageFile);
      const up = await fetchWithAuth(
        `${getApiBaseUrl()}/recipes/${recipe.id}/dish-image`,
        {
          method: "POST",
          body: JSON.stringify({ imageBase64: dataUrl }),
        },
        getToken,
      );
      if (!up.ok) {
        const errBody: unknown = await up.json().catch(() => ({}));
        throw new Error(
          parseApiErrorMessage(errBody, "Recipe saved but image upload failed."),
        );
      }
    }
    router.push("/profile?tab=recipes&saved=1");
  }

  return (
    <PageShell variant="gradient">
      <PageHeader
        title="New recipe"
        description="Write your own recipe and optionally add a dish photo. Nothing is sent to AI unless you use the AI generator."
      />
      <p className="mb-6 text-sm text-muted-foreground">
        <Link href="/recipes/new" className="font-medium text-primary underline-offset-4 hover:underline">
          Prefer AI?
        </Link>{" "}
        Use the generator instead.
      </p>
      <RecipeManualForm
        submitLabel="Create recipe"
        onSubmit={handleSubmit}
      />
    </PageShell>
  );
}
