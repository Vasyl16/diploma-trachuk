"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";

import { PageHeader, PageShell } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { PremiumBadge } from "@/components/user/premium-badge";
import { getApiBaseUrl } from "@/lib/api-config";
import { fetchWithAuth } from "@/lib/api-fetch";

type UserRow = {
  id: string;
  name: string;
  avatarUrl: string | null;
  isPremium: boolean;
};

export function PeopleSearch() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [items, setItems] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 350);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    if (!isLoaded) return;
    if (debounced.length < 1) {
      setItems([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setItems(null);
    setError(null);
    void (async () => {
      try {
        const url = `${getApiBaseUrl()}/users/search?q=${encodeURIComponent(debounced)}`;
        const res = isSignedIn
          ? await fetchWithAuth(url, { method: "GET" }, getToken)
          : await fetch(url, { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as {
          items?: UserRow[];
        } | null;
        if (cancelled) return;
        if (!res.ok) {
          setError("Could not search people.");
          setItems([]);
          return;
        }
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch {
        if (!cancelled) {
          setError("Network error. Is the API running?");
          setItems([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, getToken, isLoaded, isSignedIn]);

  const loading = debounced.length >= 1 && items === null && !error;

  return (
    <PageShell wide>
      <PageHeader
        title="Find people"
        description="Search community members by display name. Email addresses are not shown."
      />
      <div className="max-w-md space-y-2">
        <label htmlFor="people-q" className="text-xs font-medium text-muted-foreground">
          Name
        </label>
        <Input
          id="people-q"
          type="search"
          placeholder="Start typing a name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
        />
      </div>
      {error ? (
        <p className="mt-4 text-sm text-destructive">{error}</p>
      ) : null}
      {debounced.length < 1 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Enter at least one character to search.
        </p>
      ) : loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Searching…</p>
      ) : items && items.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No people found.</p>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-xl border border-border">
          {(items ?? []).map((u) => (
            <li key={u.id}>
              <Link
                href={`/users/${u.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
              >
                {u.avatarUrl ? (
                  <img
                    src={u.avatarUrl}
                    alt=""
                    className="size-10 shrink-0 rounded-full border border-border object-cover"
                    width={40}
                    height={40}
                  />
                ) : (
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-medium text-muted-foreground"
                    aria-hidden
                  >
                    {u.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{u.name}</span>
                  {u.isPremium ? <PremiumBadge className="text-[10px]" /> : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
