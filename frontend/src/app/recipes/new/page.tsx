"use client";

import { useAuth } from "@clerk/nextjs";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { PageHeader, PageShell } from "@/components/layout";
import { AlertMessage } from "@/components/feedback/alert-message";
import { AiRecipeFormCard } from "@/components/recipe/ai-recipe-form-card";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/lib/api-config";
import { parseApiErrorMessage } from "@/lib/api-error";
import { fetchWithAuth } from "@/lib/api-fetch";

function NewAiRecipeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [ingredients, setIngredients] = useState("");
  const [dishType, setDishType] = useState("");
  const [complexity, setComplexity] = useState("");
  const [diet, setDiet] = useState("");
  const [restrictions, setRestrictions] = useState("");
  const [avoidIngredients, setAvoidIngredients] = useState("");
  const [generateImage, setGenerateImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeMode, setUpgradeMode] = useState(false);
  const [showPremiumSuccess, setShowPremiumSuccess] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [premiumAccessLoaded, setPremiumAccessLoaded] = useState(false);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      setShowPremiumSuccess(true);
      router.replace("/recipes/new", { scroll: false });
    } else if (checkout === "cancelled") {
      setShowCancelled(true);
      router.replace("/recipes/new", { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setUpgradeMode(false);
      setPremiumAccessLoaded(true);
      return;
    }

    void (async () => {
      try {
        const res = await fetchWithAuth(
          `${getApiBaseUrl()}/users/me`,
          { method: "GET" },
          getToken,
        );
        const body = (await res.json().catch(() => null)) as
          | { isPremium?: boolean }
          | null;
        if (res.ok) {
          setUpgradeMode(!Boolean(body?.isPremium));
        } else {
          setUpgradeMode(false);
        }
      } catch {
        setUpgradeMode(false);
      } finally {
        setPremiumAccessLoaded(true);
      }
    })();
  }, [getToken, isLoaded, isSignedIn, showPremiumSuccess]);

  function handleFieldChange(
    field:
      | "ingredients"
      | "dishType"
      | "complexity"
      | "diet"
      | "restrictions"
      | "avoidIngredients",
    value: string,
  ) {
    if (field === "ingredients") setIngredients(value);
    else if (field === "dishType") setDishType(value);
    else if (field === "complexity") setComplexity(value);
    else if (field === "diet") setDiet(value);
    else if (field === "restrictions") setRestrictions(value);
    else setAvoidIngredients(value);
  }

  async function handleBuyPremium() {
    setError(null);
    setCheckoutLoading(true);
    try {
      const res = await fetchWithAuth(
        `${getApiBaseUrl()}/payments/create-checkout-session`,
        { method: "POST" },
        getToken,
      );
      const body: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          parseApiErrorMessage(
            body,
            res.status === 401
              ? "Sign in required."
              : "Could not start checkout.",
          ),
        );
        return;
      }
      const url =
        typeof body === "object" &&
        body !== null &&
        "url" in body &&
        typeof (body as { url: unknown }).url === "string"
          ? (body as { url: string }).url
          : null;
      if (url) {
        window.location.href = url;
      } else {
        setError("Checkout URL missing from server.");
      }
    } catch {
      setError("Network error starting checkout.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const ingredientList = ingredients
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const restrictionList = restrictions
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const avoidList = avoidIngredients
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    try {
      const res = await fetchWithAuth(
        `${getApiBaseUrl()}/recipes/ai-generate`,
        {
          method: "POST",
          body: JSON.stringify({
            ingredients: ingredientList.length ? ingredientList : undefined,
            dishType: dishType.trim() || undefined,
            complexity: complexity.trim() || undefined,
            diet: diet.trim() || undefined,
            restrictions: restrictionList.length ? restrictionList : undefined,
            avoidIngredients: avoidList.length ? avoidList : undefined,
            generateImage: generateImage ? true : undefined,
          }),
        },
        getToken,
      );

      const body: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = parseApiErrorMessage(
          body,
          res.status === 401
            ? "Sign in required."
            : "Something went wrong.",
        );
        if (msg === "Upgrade to premium") {
          setUpgradeMode(true);
        }
        setError(msg);
        return;
      }

      const payload = body as { imageNote?: string };
      if (typeof payload.imageNote === "string" && payload.imageNote.length) {
        try {
          sessionStorage.setItem(
            "recipeStudioRecipeImageNote",
            payload.imageNote,
          );
        } catch {
          /* ignore quota / private mode */
        }
      }

      router.push("/profile?saved=1");
    } catch {
      setError(
        "Network error. Check NEXT_PUBLIC_API_URL and that the API is running.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell variant="gradient">
      <PageHeader
        eyebrow={
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" aria-hidden />
            AI recipe lab
          </div>
        }
        title="Generate a recipe"
        description="Add ingredients and hints — the API returns structured recipe JSON. Optional dish images are generated on the server (no extra login)."
      />

      {showPremiumSuccess ? (
        <AlertMessage variant="success" className="mb-6">
          You are now premium
        </AlertMessage>
      ) : null}

      {showCancelled ? (
        <AlertMessage variant="muted" className="mb-6">
          Checkout was cancelled.
        </AlertMessage>
      ) : null}

      {upgradeMode ? (
        <div className="mb-6 rounded-xl border border-border bg-card px-6 py-5 shadow-sm">
          <p className="text-sm font-medium text-foreground">Upgrade to Premium</p>
          <p className="mt-1 text-sm text-muted-foreground">
            AI recipe generation is available only for premium users.
          </p>
          <Button
            type="button"
            className="mt-4"
            disabled={checkoutLoading || !isLoaded}
            onClick={() => void handleBuyPremium()}
          >
            {checkoutLoading ? "Opening checkout…" : "Buy Premium"}
          </Button>
        </div>
      ) : null}

      {!isLoaded || !premiumAccessLoaded ? (
        <p className="text-sm text-muted-foreground">Checking access…</p>
      ) : !isSignedIn ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
          <p className="text-muted-foreground">
            Sign in with a premium account to use AI recipe generation.
          </p>
          <Link href="/sign-in" className="mt-4 inline-flex">
            <Button type="button">Sign in</Button>
          </Link>
        </div>
      ) : upgradeMode ? null : (
        <AiRecipeFormCard
          values={{
            ingredients,
            dishType,
            complexity,
            diet,
            restrictions,
            avoidIngredients,
          }}
          onChange={handleFieldChange}
          generateImage={generateImage}
          onGenerateImageChange={setGenerateImage}
          onSubmit={handleSubmit}
          loading={loading || !isLoaded}
          error={error}
        />
      )}
    </PageShell>
  );
}

export default function NewAiRecipePage() {
  return (
    <Suspense
      fallback={
        <PageShell variant="gradient">
          <PageHeader
            title="Generate a recipe"
            description="Loading…"
          />
        </PageShell>
      }
    >
      <NewAiRecipeInner />
    </Suspense>
  );
}
