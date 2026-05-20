"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Loader2, MessageCircle, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AlertMessage } from "@/components/feedback/alert-message";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/lib/api-config";
import { parseApiErrorMessage } from "@/lib/api-error";
import { fetchWithAuth } from "@/lib/api-fetch";

export type RecipeCommentItem = {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  user: { name: string; avatarUrl: string | null };
};

type Props = {
  recipeId: string;
  recipeOwnerUserId: string;
};

function formatCommentDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function RecipeCommentsSection({
  recipeId,
  recipeOwnerUserId,
}: Props) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [comments, setComments] = useState<RecipeCommentItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const url = `${getApiBaseUrl()}/recipes/${encodeURIComponent(recipeId)}/comments`;
      const res = isSignedIn
        ? await fetchWithAuth(url, { method: "GET" }, getToken)
        : await fetch(url, { method: "GET", cache: "no-store" });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setComments([]);
        setLoadError(
          parseApiErrorMessage(
            data,
            res.status === 403
              ? "You can’t view comments on this recipe."
              : "Could not load comments.",
          ),
        );
        return;
      }
      const list = Array.isArray(data)
        ? (data as RecipeCommentItem[])
        : [];
      const normalized = list.map((c) => ({
        id: String(c.id),
        body: String(c.body),
        createdAt: String(c.createdAt),
        userId: String(c.userId),
        user: {
          name: c.user?.name ?? "",
          avatarUrl:
            c.user?.avatarUrl === undefined || c.user.avatarUrl === null
              ? null
              : String(c.user.avatarUrl),
        },
      }));
      normalized.sort((a, b) => {
        const ta = Date.parse(a.createdAt);
        const tb = Date.parse(b.createdAt);
        if (tb !== ta) return tb - ta;
        return b.id.localeCompare(a.id);
      });
      setComments(normalized);
    } catch {
      setComments([]);
      setLoadError("Network error.");
    }
  }, [getToken, isSignedIn, recipeId]);

  useEffect(() => {
    if (!isLoaded || !recipeId) return;
    void load();
  }, [isLoaded, load, recipeId]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setMyId(null);
      return;
    }
    void (async () => {
      try {
        const res = await fetchWithAuth(
          `${getApiBaseUrl()}/users/me`,
          { method: "GET" },
          getToken,
        );
        const data = (await res.json().catch(() => null)) as {
          id?: string;
        } | null;
        if (res.ok && data?.id) setMyId(data.id);
        else setMyId(null);
      } catch {
        setMyId(null);
      }
    })();
  }, [getToken, isLoaded, isSignedIn]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSignedIn || !recipeId.trim()) return;
    const body = text.trim();
    if (!body.length || body.length > 2000) {
      setPostError(
        body.length > 2000
          ? "Comment is too long (max 2000 characters)."
          : "Write something before posting.",
      );
      return;
    }
    setPostError(null);
    setPosting(true);
    try {
      const res = await fetchWithAuth(
        `${getApiBaseUrl()}/recipes/${encodeURIComponent(recipeId)}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        },
        getToken,
      );
      const payload: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPostError(
          parseApiErrorMessage(
            payload,
            res.status === 401
              ? "Sign in to comment."
              : "Could not post comment.",
          ),
        );
        return;
      }
      setText("");
      const o = payload as RecipeCommentItem;
      if (o?.id && o.body) {
        setComments((prev) => [
          {
            id: String(o.id),
            body: String(o.body),
            createdAt: String(o.createdAt ?? new Date().toISOString()),
            userId: String(o.userId),
            user: {
              name: o.user?.name ?? "",
              avatarUrl:
                o.user?.avatarUrl === undefined || o.user.avatarUrl === null
                  ? null
                  : String(o.user.avatarUrl),
            },
          },
          ...(prev ?? []),
        ]);
      } else {
        await load();
      }
    } catch {
      setPostError("Network error.");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (!isSignedIn || deletingId) return;
    setDeletingId(commentId);
    try {
      const res = await fetchWithAuth(
        `${getApiBaseUrl()}/recipes/${encodeURIComponent(recipeId)}/comments/${encodeURIComponent(commentId)}`,
        { method: "DELETE" },
        getToken,
      );
      if (!res.ok) {
        const payload: unknown = await res.json().catch(() => ({}));
        setLoadError(parseApiErrorMessage(payload, "Could not delete comment."));
        return;
      }
      setComments((prev) =>
        prev ? prev.filter((c) => c.id !== commentId) : prev,
      );
    } catch {
      setLoadError("Network error deleting comment.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="space-y-4 border-t border-border pt-8">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-muted-foreground" aria-hidden />
        <h2 className="font-heading text-lg font-semibold">Comments</h2>
        {comments !== null ? (
          <span className="text-sm text-muted-foreground">
            ({comments.length})
          </span>
        ) : null}
      </div>

      {loadError ? <AlertMessage>{loadError}</AlertMessage> : null}

      {!isSignedIn ? (
        <p className="text-sm text-muted-foreground">
          <Link
            href="/sign-in"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>{" "}
          to leave a comment.
        </p>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2">
          <label htmlFor="recipe-comment" className="sr-only">
            Your comment
          </label>
          <textarea
            id="recipe-comment"
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[88px] w-full max-w-xl rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50"
            placeholder="Share a tip or ask about this recipe…"
            value={text}
            disabled={posting}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="sm" disabled={posting || !text.trim()}>
              {posting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Posting…
                </>
              ) : (
                "Post comment"
              )}
            </Button>
            <span className="text-xs text-muted-foreground">
              {text.length}/2000
            </span>
          </div>
          {postError ? <AlertMessage>{postError}</AlertMessage> : null}
        </form>
      )}

      {comments === null ? (
        <p className="text-sm text-muted-foreground">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No comments yet — be the first to say something.
        </p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => {
            const canDelete =
              Boolean(myId) &&
              (c.userId === myId || recipeOwnerUserId === myId);

            return (
              <li
                key={c.id}
                className="rounded-lg border border-border bg-muted/20 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {c.user.name || "Someone"}
                      </span>
                      <time
                        className="text-xs text-muted-foreground"
                        dateTime={c.createdAt}
                      >
                        {formatCommentDate(c.createdAt)}
                      </time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {c.body}
                    </p>
                  </div>
                  {canDelete ? (
                    <button
                      type="button"
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      title="Delete comment"
                      disabled={deletingId === c.id}
                      aria-label="Delete comment"
                      onClick={() => void handleDelete(c.id)}
                    >
                      {deletingId === c.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
