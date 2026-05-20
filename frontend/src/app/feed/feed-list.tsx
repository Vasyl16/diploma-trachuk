"use client";

import { useAuth } from "@clerk/nextjs";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CustomMenuSelect } from "@/components/custom-menu-select";
import { PageHeader, PageShell } from "@/components/layout";
import { RecipeFeedCard } from "@/components/recipe/recipe-feed-card";
import { Input } from "@/components/ui/input";
import { getApiBaseUrl } from "@/lib/api-config";
import { fetchWithAuth } from "@/lib/api-fetch";
import type { FeedRecipe } from "@/types/recipe";

const PAGE_SIZE = 12;

type LikeResponse = { likesCount: number; likedByMe: boolean };
type SaveResponse = { savedByMe: boolean };

type FeedApiResponse = {
  items?: unknown[];
  nextOffset?: number | null;
};

function normalizeFeedItem(raw: FeedRecipe): FeedRecipe {
  return {
    ...raw,
    imageUrl:
      raw.imageUrl === null || raw.imageUrl === undefined
        ? null
        : String(raw.imageUrl),
    category:
      raw.category === null || raw.category === undefined
        ? null
        : String(raw.category),
    tags: Array.isArray(raw.tags)
      ? raw.tags.map((t) => String(t).toLowerCase())
      : [],
    diet:
      raw.diet === null || raw.diet === undefined
        ? null
        : String(raw.diet),
    restrictions: Array.isArray(raw.restrictions)
      ? raw.restrictions.map((x) => String(x).toLowerCase())
      : [],
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

function feedQueryString(
  offset: number,
  opts: {
    q: string;
    tag: string;
    category: string;
    includeIng: string;
    excludeIng: string;
    diet: string;
    restriction: string;
  },
): string {
  const p = new URLSearchParams();
  p.set("offset", String(offset));
  p.set("limit", String(PAGE_SIZE));
  const qt = opts.q.trim();
  if (qt) p.set("q", qt);
  if (opts.tag.trim()) p.set("tag", opts.tag.trim().toLowerCase());
  if (opts.category.trim()) p.set("category", opts.category.trim());
  if (opts.includeIng.trim()) p.set("includeIng", opts.includeIng.trim());
  if (opts.excludeIng.trim()) p.set("excludeIng", opts.excludeIng.trim());
  if (opts.diet.trim()) p.set("diet", opts.diet.trim().toLowerCase());
  if (opts.restriction.trim()) p.set("restriction", opts.restriction.trim());
  return p.toString();
}

export function FeedList() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qUrl = searchParams.get("q") ?? "";
  const tagUrl = searchParams.get("tag") ?? "";
  const categoryUrl = searchParams.get("category") ?? "";
  const includeIngUrl = searchParams.get("includeIng") ?? "";
  const excludeIngUrl = searchParams.get("excludeIng") ?? "";
  const dietUrl = searchParams.get("diet") ?? "";
  const restrictionUrl = searchParams.get("restriction") ?? "";

  const [recipes, setRecipes] = useState<FeedRecipe[] | null>(null);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [togglingLikeId, setTogglingLikeId] = useState<string | null>(null);
  const [togglingSaveId, setTogglingSaveId] = useState<string | null>(null);
  const [myDbUserId, setMyDbUserId] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [qInput, setQInput] = useState(qUrl);
  const [includeIngInput, setIncludeIngInput] = useState(includeIngUrl);
  const [excludeIngInput, setExcludeIngInput] = useState(excludeIngUrl);
  const [restrictionInput, setRestrictionInput] = useState(restrictionUrl);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [facets, setFacets] = useState<{
    categories: string[];
    tags: string[];
    diets: string[];
    restrictions: string[];
  } | null>(null);

  useEffect(() => {
    setQInput(qUrl);
  }, [qUrl]);

  useEffect(() => {
    setIncludeIngInput(includeIngUrl);
  }, [includeIngUrl]);

  useEffect(() => {
    setExcludeIngInput(excludeIngUrl);
  }, [excludeIngUrl]);

  useEffect(() => {
    setRestrictionInput(restrictionUrl);
  }, [restrictionUrl]);

  useEffect(() => {
    const id = setTimeout(() => {
      const nextQ = qInput.trim();
      const nextInc = includeIngInput.trim();
      const nextExc = excludeIngInput.trim();
      const nextRest = restrictionInput.trim();
      if (
        nextQ === qUrl.trim() &&
        nextInc === includeIngUrl.trim() &&
        nextExc === excludeIngUrl.trim() &&
        nextRest === restrictionUrl.trim()
      ) {
        return;
      }
      const p = new URLSearchParams();
      if (nextQ) p.set("q", nextQ);
      if (tagUrl.trim()) p.set("tag", tagUrl.trim());
      if (categoryUrl.trim()) p.set("category", categoryUrl.trim());
      if (dietUrl.trim()) p.set("diet", dietUrl.trim().toLowerCase());
      if (nextInc) p.set("includeIng", nextInc);
      if (nextExc) p.set("excludeIng", nextExc);
      if (nextRest) p.set("restriction", nextRest);
      router.replace(`/feed?${p.toString()}`);
    }, 380);
    return () => clearTimeout(id);
  }, [
    qInput,
    includeIngInput,
    excludeIngInput,
    restrictionInput,
    qUrl,
    includeIngUrl,
    excludeIngUrl,
    restrictionUrl,
    tagUrl,
    categoryUrl,
    dietUrl,
    router,
  ]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/recipes/facets`, {
          cache: "no-store",
        });
        const data = (await res.json().catch(() => null)) as {
          categories?: string[];
          tags?: string[];
          diets?: string[];
          restrictions?: string[];
        } | null;
        if (!cancelled && data) {
          setFacets({
            categories: Array.isArray(data.categories) ? data.categories : [],
            tags: Array.isArray(data.tags) ? data.tags : [],
            diets: Array.isArray(data.diets) ? data.diets : [],
            restrictions: Array.isArray(data.restrictions)
              ? data.restrictions
              : [],
          });
        }
      } catch {
        if (!cancelled)
          setFacets({ categories: [], tags: [], diets: [], restrictions: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryOptions = useMemo(() => {
    const list = [...(facets?.categories ?? [])].sort((a, b) =>
      a.localeCompare(b),
    );
    return [
      { value: "", label: "All categories" },
      ...list.map((c) => ({ value: c, label: c })),
    ];
  }, [facets]);

  const tagOptions = useMemo(() => {
    const list = [...(facets?.tags ?? [])].sort((a, b) => a.localeCompare(b));
    return [
      { value: "", label: "All tags" },
      ...list.map((t) => ({ value: t, label: `#${t}` })),
    ];
  }, [facets]);

  const dietOptions = useMemo(() => {
    const list = [...(facets?.diets ?? [])].sort((a, b) => a.localeCompare(b));
    return [
      { value: "", label: "Any diet" },
      ...list.map((d) => ({ value: d, label: d })),
    ];
  }, [facets]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (qUrl.trim()) n += 1;
    if (tagUrl.trim()) n += 1;
    if (categoryUrl.trim()) n += 1;
    if (dietUrl.trim()) n += 1;
    if (includeIngUrl.trim()) n += 1;
    if (excludeIngUrl.trim()) n += 1;
    if (restrictionUrl.trim()) n += 1;
    return n;
  }, [
    qUrl,
    tagUrl,
    categoryUrl,
    dietUrl,
    includeIngUrl,
    excludeIngUrl,
    restrictionUrl,
  ]);

  function replaceFeedQuery(
    partial: Partial<{
      q: string;
      tag: string;
      category: string;
      includeIng: string;
      excludeIng: string;
      diet: string;
      restriction: string;
    }>,
  ) {
    const p = new URLSearchParams();
    const qv = (partial.q !== undefined ? partial.q : qUrl).trim();
    const tv = (partial.tag !== undefined ? partial.tag : tagUrl).trim();
    const cv = (
      partial.category !== undefined ? partial.category : categoryUrl
    ).trim();
    const iv = (
      partial.includeIng !== undefined ? partial.includeIng : includeIngUrl
    ).trim();
    const ev = (
      partial.excludeIng !== undefined ? partial.excludeIng : excludeIngUrl
    ).trim();
    const dv = (partial.diet !== undefined ? partial.diet : dietUrl).trim();
    const rv = (
      partial.restriction !== undefined ? partial.restriction : restrictionUrl
    ).trim();
    if (qv) p.set("q", qv);
    if (tv) p.set("tag", tv.toLowerCase());
    if (cv) p.set("category", cv);
    if (dv) p.set("diet", dv.toLowerCase());
    if (iv) p.set("includeIng", iv);
    if (ev) p.set("excludeIng", ev);
    if (rv) p.set("restriction", rv);
    router.replace(`/feed?${p.toString()}`);
  }

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

  const loadPage = useCallback(
    async (offset: number, append: boolean) => {
      setError(null);
      if (append) setLoadingMore(true);
      try {
        const qs = feedQueryString(offset, {
          q: qUrl,
          tag: tagUrl,
          category: categoryUrl,
          includeIng: includeIngUrl,
          excludeIng: excludeIngUrl,
          diet: dietUrl,
          restriction: restrictionUrl,
        });
        const url = `${getApiBaseUrl()}/recipes?${qs}`;
        const res = isSignedIn
          ? await fetchWithAuth(url, { method: "GET" }, getToken)
          : await fetch(url, { method: "GET", cache: "no-store" });
        const data: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          setError("Could not load the feed.");
          if (!append) setRecipes([]);
          setNextOffset(null);
          return;
        }
        const json = data as FeedApiResponse;
        const list = Array.isArray(json.items) ? json.items : [];
        const normalized = list.map((item) =>
          normalizeFeedItem(item as FeedRecipe),
        );
        setRecipes((prev) => {
          if (!append) return normalized;
          const merged = [...(prev ?? [])];
          const seen = new Set(merged.map((r) => r.id));
          for (const r of normalized) {
            if (!seen.has(r.id)) {
              seen.add(r.id);
              merged.push(r);
            }
          }
          return merged;
        });
        setNextOffset(
          typeof json.nextOffset === "number" ? json.nextOffset : null,
        );
      } catch {
        setError("Network error. Is the API running?");
        if (!append) setRecipes([]);
        setNextOffset(null);
      } finally {
        if (append) setLoadingMore(false);
      }
    },
    [
      getToken,
      isSignedIn,
      qUrl,
      tagUrl,
      categoryUrl,
      includeIngUrl,
      excludeIngUrl,
      dietUrl,
      restrictionUrl,
    ],
  );

  useEffect(() => {
    if (!isLoaded) return;
    setRecipes(null);
    setNextOffset(null);
    void loadPage(0, false);
  }, [
    isLoaded,
    isSignedIn,
    loadPage,
    qUrl,
    tagUrl,
    categoryUrl,
    includeIngUrl,
    excludeIngUrl,
    dietUrl,
    restrictionUrl,
  ]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || nextOffset === null || loadingMore || recipes === null) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (hit && nextOffset !== null && !loadingMore) {
          void loadPage(nextOffset, true);
        }
      },
      { rootMargin: "240px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [nextOffset, loadingMore, recipes, loadPage]);

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
      const data = (await res.json().catch(() => null)) as LikeResponse | null;
      if (!res.ok) {
        throw new Error("toggle failed");
      }
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
      const data = (await res.json().catch(() => null)) as SaveResponse | null;
      if (!res.ok) {
        throw new Error("save failed");
      }
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

  const initialLoading = recipes === null;

  return (
    <PageShell wide>
      <PageHeader
        title="Feed"
        description="Published recipes from the community — scroll for more, like and save posts."
      />

      <div className="mb-6 overflow-hidden rounded-xl border border-border bg-muted/25">
        <button
          type="button"
          id="feed-filters-toggle"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50"
          aria-expanded={filtersOpen}
          aria-controls="feed-filters-panel"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">
              Search & filters
            </span>
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                {activeFilterCount} active
              </span>
            ) : null}
            <span className="text-xs font-normal text-muted-foreground">
              {!filtersOpen ? "Tap to expand" : "Tap to hide"}
            </span>
          </span>
          {filtersOpen ? (
            <ChevronUp
              className="size-5 shrink-0 text-muted-foreground"
              aria-hidden
            />
          ) : (
            <ChevronDown
              className="size-5 shrink-0 text-muted-foreground"
              aria-hidden
            />
          )}
        </button>

        <div
          id="feed-filters-panel"
          role="region"
          aria-labelledby="feed-filters-toggle"
          className={filtersOpen ? "space-y-4 border-t border-border px-4 pb-4 pt-4" : "hidden"}
        >
        <p className="text-xs text-muted-foreground">
          Feed order: <span className="font-medium text-foreground">newest first</span>.
        </p>
        <div className="min-w-0 space-y-1.5">
          <label htmlFor="feed-search" className="text-xs font-medium text-muted-foreground">
            Search
          </label>
          <Input
            id="feed-search"
            type="search"
            placeholder="Search title, diet, restrictions, tags, ingredients…"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            className="w-full md:max-w-xl"
            autoComplete="off"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3">
          <div className="min-w-0 space-y-1.5">
            <label
              htmlFor="feed-include-ing"
              className="text-xs font-medium text-muted-foreground"
            >
              Include ingredients
            </label>
            <Input
              id="feed-include-ing"
              type="text"
              placeholder="e.g. chicken, garlic"
              value={includeIngInput}
              onChange={(e) => setIncludeIngInput(e.target.value)}
              className="w-full"
              autoComplete="off"
              aria-describedby="feed-include-ing-hint"
            />
            <p
              id="feed-include-ing-hint"
              className="text-[0.7rem] leading-snug text-muted-foreground sm:text-xs"
            >
              Comma-separated — every term must appear in ingredients.
            </p>
          </div>
          <div className="min-w-0 space-y-1.5">
            <label
              htmlFor="feed-exclude-ing"
              className="text-xs font-medium text-muted-foreground"
            >
              Exclude ingredients
            </label>
            <Input
              id="feed-exclude-ing"
              type="text"
              placeholder="e.g. dairy, nuts"
              value={excludeIngInput}
              onChange={(e) => setExcludeIngInput(e.target.value)}
              className="w-full"
              autoComplete="off"
              aria-describedby="feed-exclude-ing-hint"
            />
            <p
              id="feed-exclude-ing-hint"
              className="text-[0.7rem] leading-snug text-muted-foreground sm:text-xs"
            >
              Comma-separated — hide if any term appears in ingredients.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 w-full sm:min-w-42 sm:max-w-[min(100%,16rem)] sm:flex-1">
            <label
              htmlFor="feed-filter-category"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Category
            </label>
            <CustomMenuSelect
              id="feed-filter-category"
              value={categoryUrl}
              onChange={(v) => replaceFeedQuery({ category: v })}
              options={categoryOptions}
              listboxAriaLabel="Category list"
              placeholder="All categories"
            />
          </div>
          <div className="min-w-0 w-full sm:min-w-42 sm:max-w-[min(100%,16rem)] sm:flex-1">
            <label
              htmlFor="feed-filter-tag"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Tag
            </label>
            <CustomMenuSelect
              id="feed-filter-tag"
              value={tagUrl}
              onChange={(v) => replaceFeedQuery({ tag: v })}
              options={tagOptions}
              listboxAriaLabel="Tag list"
              placeholder="All tags"
            />
          </div>
          <div className="min-w-0 w-full sm:min-w-42 sm:max-w-[min(100%,16rem)] sm:flex-1">
            <label
              htmlFor="feed-filter-diet"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Diet
            </label>
            <CustomMenuSelect
              id="feed-filter-diet"
              value={dietUrl}
              onChange={(v) => replaceFeedQuery({ diet: v })}
              options={dietOptions}
              listboxAriaLabel="Diet list"
              placeholder="Any diet"
            />
          </div>
          {qUrl ||
          tagUrl ||
          categoryUrl ||
          dietUrl ||
          includeIngUrl ||
          excludeIngUrl ||
          restrictionUrl ? (
            <button
              type="button"
              className="h-9 w-full shrink-0 rounded-md border border-border bg-muted/40 px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:w-auto sm:self-end"
              onClick={() => {
                setQInput("");
                setIncludeIngInput("");
                setExcludeIngInput("");
                setRestrictionInput("");
                router.replace("/feed");
              }}
            >
              Clear filters
            </button>
          ) : null}
        </div>

        <div className="min-w-0 space-y-1.5">
          <label
            htmlFor="feed-restriction"
            className="text-xs font-medium text-muted-foreground"
          >
            Match dietary labels
          </label>
          <Input
            id="feed-restriction"
            type="text"
            placeholder="e.g. gluten-free, dairy-free"
            value={restrictionInput}
            onChange={(e) => setRestrictionInput(e.target.value)}
            className="w-full max-w-xl"
            autoComplete="off"
            aria-describedby="feed-restriction-hint"
          />
          <p
            id="feed-restriction-hint"
            className="text-[0.7rem] leading-snug text-muted-foreground sm:text-xs"
          >
            Comma-separated — recipe must list every term in its dietary
            restrictions (substring match).
          </p>
        </div>
      </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      {initialLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : recipes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center text-muted-foreground">
          No recipes yet.
        </div>
      ) : (
        <>
          <ul className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
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
          {nextOffset !== null ? (
            <div
              ref={loadMoreRef}
              className="flex min-h-12 items-center justify-center py-6"
              aria-hidden
            >
              {loadingMore ? (
                <p className="text-sm text-muted-foreground">Loading more…</p>
              ) : (
                <span className="text-xs text-muted-foreground/70">
                  Scroll for more
                </span>
              )}
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-muted-foreground">
              You&apos;ve reached the end of the feed.
            </p>
          )}
        </>
      )}
    </PageShell>
  );
}
