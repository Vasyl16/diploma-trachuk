"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Ban, SendHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PageHeader, PageShell } from "@/components/layout";
import { PremiumBadge } from "@/components/user/premium-badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { getApiBaseUrl } from "@/lib/api-config";
import { parseApiErrorMessage } from "@/lib/api-error";
import { fetchWithAuth } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";

type ChatUser = {
  id: string;
  name: string;
  avatarUrl: string | null;
  isPremium: boolean;
};

type ConversationSummary = {
  id: string;
  participant: ChatUser;
  lastMessageText: string | null;
  lastMessageAt: string;
  updatedAt: string;
  blockedByMe: boolean;
  blockedMe: boolean;
};

type SharedRecipe = {
  id: string;
  title: string;
  imageUrl: string | null;
  isPublished: boolean;
  userId: string;
  user: {
    id: string;
    name: string;
  };
};

type MessageItem = {
  id: string;
  text: string | null;
  createdAt: string;
  senderId: string;
  sender: ChatUser;
  recipe: SharedRecipe | null;
};

type ThreadResponse = {
  conversation: ConversationSummary;
  messages: MessageItem[];
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function MessagesClient() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get("with")?.trim() ?? "";
  const pendingRecipeId = searchParams.get("recipe")?.trim() ?? "";

  const [conversations, setConversations] = useState<ConversationSummary[] | null>(
    null,
  );
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [thread, setThread] = useState<ThreadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [composerText, setComposerText] = useState("");
  const [sending, setSending] = useState(false);
  const [togglingBlock, setTogglingBlock] = useState(false);
  const [pendingRecipe, setPendingRecipe] = useState<SharedRecipe | null>(null);
  const startedForUserRef = useRef<string | null>(null);

  const selectedConversation = useMemo(
    () =>
      conversations?.find((conversation) => conversation.id === selectedConversationId) ??
      null,
    [conversations, selectedConversationId],
  );

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetchWithAuth(
        `${getApiBaseUrl()}/messages/conversations`,
        { method: "GET" },
        getToken,
      );
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(parseApiErrorMessage(data, "Could not load messages."));
      }
      const list = Array.isArray(data) ? (data as ConversationSummary[]) : [];
      setConversations(list);
      setSelectedConversationId((prev) =>
        prev && list.some((item) => item.id === prev)
          ? prev
          : (list[0]?.id ?? null),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load messages.");
      setConversations([]);
      setSelectedConversationId(null);
    }
  }, [getToken]);

  const loadThread = useCallback(
    async (conversationId: string) => {
      try {
        const res = await fetchWithAuth(
          `${getApiBaseUrl()}/messages/conversations/${encodeURIComponent(conversationId)}/messages`,
          { method: "GET" },
          getToken,
        );
        const data: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(parseApiErrorMessage(data, "Could not load chat."));
        }
        setThread(data as ThreadResponse);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load chat.");
        setThread(null);
      }
    },
    [getToken],
  );

  const loadPendingRecipe = useCallback(
    async (recipeId: string) => {
      const res = await fetchWithAuth(
        `${getApiBaseUrl()}/recipes/${encodeURIComponent(recipeId)}`,
        { method: "GET" },
        getToken,
      );
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(parseApiErrorMessage(data, "Could not load recipe."));
      }
      const recipe = data as {
        id: string;
        title: string;
        imageUrl?: string | null;
        isPublished: boolean;
        userId: string;
        user: { id?: string; name: string };
      };
      return {
        id: recipe.id,
        title: recipe.title,
        imageUrl: recipe.imageUrl ?? null,
        isPublished: Boolean(recipe.isPublished),
        userId: recipe.userId,
        user: {
          id: recipe.user?.id ?? recipe.userId,
          name: recipe.user?.name ?? "",
        },
      } satisfies SharedRecipe;
    },
    [getToken],
  );

  const startConversation = useCallback(
    async (otherUserId: string) => {
      const res = await fetchWithAuth(
        `${getApiBaseUrl()}/messages/conversations`,
        {
          method: "POST",
          body: JSON.stringify({ otherUserId }),
        },
        getToken,
      );
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          parseApiErrorMessage(data, "Could not open this conversation."),
        );
      }
      const created = data as ConversationSummary;
      setConversations((prev) => {
        const list = prev ?? [];
        const remaining = list.filter((item) => item.id !== created.id);
        return [created, ...remaining];
      });
      setSelectedConversationId(created.id);
      return created.id;
    },
    [getToken],
  );

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    setError(null);
    void loadConversations();
  }, [isLoaded, isSignedIn, loadConversations]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !targetUserId) {
      startedForUserRef.current = null;
      return;
    }
    if (startedForUserRef.current === targetUserId) return;

    void (async () => {
      try {
        setError(null);
        await startConversation(targetUserId);
        startedForUserRef.current = targetUserId;
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not start this conversation.",
        );
      }
    })();
  }, [getToken, isLoaded, isSignedIn, startConversation, targetUserId]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !pendingRecipeId) {
      setPendingRecipe(null);
      return;
    }
    void (async () => {
      try {
        const recipe = await loadPendingRecipe(pendingRecipeId);
        setPendingRecipe(recipe);
      } catch (e) {
        setPendingRecipe(null);
        setError(e instanceof Error ? e.message : "Could not load recipe.");
      }
    })();
  }, [getToken, isLoaded, isSignedIn, loadPendingRecipe, pendingRecipeId]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !selectedConversationId) {
      setThread(null);
      return;
    }
    setError(null);
    void loadThread(selectedConversationId);
  }, [isLoaded, isSignedIn, loadThread, selectedConversationId]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const id = window.setInterval(() => {
      void loadConversations();
      if (selectedConversationId) {
        void loadThread(selectedConversationId);
      }
    }, 8000);
    return () => window.clearInterval(id);
  }, [isLoaded, isSignedIn, loadConversations, loadThread, selectedConversationId]);

  async function handleToggleBlock(shouldBlock: boolean) {
    if (!selectedConversation || togglingBlock) return;
    setTogglingBlock(true);
    try {
      setError(null);
      const method = shouldBlock ? "POST" : "DELETE";
      const res = await fetchWithAuth(
        `${getApiBaseUrl()}/messages/users/${encodeURIComponent(selectedConversation.participant.id)}/block`,
        { method },
        getToken,
      );
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          parseApiErrorMessage(
            data,
            shouldBlock ? "Could not block this user." : "Could not unblock this user.",
          ),
        );
      }
      await Promise.all([
        loadConversations(),
        selectedConversationId ? loadThread(selectedConversationId) : Promise.resolve(),
      ]);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : shouldBlock
            ? "Could not block this user."
            : "Could not unblock this user.",
      );
    } finally {
      setTogglingBlock(false);
    }
  }

  async function handleSend() {
    if (
      !selectedConversationId ||
      (!composerText.trim() && !pendingRecipe) ||
      sending ||
      thread?.conversation.blockedByMe ||
      thread?.conversation.blockedMe
    ) {
      return;
    }
    setSending(true);
    try {
      setError(null);
      const res = await fetchWithAuth(
        `${getApiBaseUrl()}/messages/conversations/${encodeURIComponent(selectedConversationId)}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            text: composerText,
            recipeId: pendingRecipe?.id,
          }),
        },
        getToken,
      );
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(parseApiErrorMessage(data, "Could not send message."));
      }
      setComposerText("");
      setPendingRecipe(null);
      await Promise.all([
        loadThread(selectedConversationId),
        loadConversations(),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  if (!isLoaded) {
    return (
      <PageShell wide>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </PageShell>
    );
  }

  if (!isSignedIn) {
    return (
      <PageShell wide>
        <PageHeader
          title="Messages"
          description="Private conversations with other community members."
        />
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
          <p className="text-muted-foreground">
            Sign in to open your inbox and message other users.
          </p>
          <Link
            href="/sign-in"
            className={cn(buttonVariants({ size: "sm" }), "mt-4 inline-flex")}
          >
            Sign in
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell wide>
      <PageHeader
        title="Messages"
        description="Private chats with other recipe creators."
      />

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Inbox</p>
          </div>
          {conversations === null ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Loading conversations…
            </p>
          ) : conversations.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No conversations yet. Open someone&apos;s profile and tap Message.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                      selectedConversationId === conversation.id && "bg-muted/60",
                    )}
                    onClick={() => setSelectedConversationId(conversation.id)}
                  >
                    {conversation.participant.avatarUrl ? (
                      <img
                        src={conversation.participant.avatarUrl}
                        alt=""
                        className="size-11 shrink-0 rounded-full border border-border object-cover"
                        width={44}
                        height={44}
                      />
                    ) : (
                      <div
                        className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold text-muted-foreground"
                        aria-hidden
                      >
                        {conversation.participant.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium text-foreground">
                          {conversation.participant.name}
                        </span>
                        {conversation.participant.isPremium ? (
                          <PremiumBadge className="text-[10px]" />
                        ) : null}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {conversation.lastMessageText ?? "Start the conversation"}
                      </p>
                      {conversation.blockedByMe || conversation.blockedMe ? (
                        <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-300">
                          {conversation.blockedByMe
                            ? "Blocked by you"
                            : "Cannot message you"}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatTime(conversation.lastMessageAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="flex min-h-128 flex-col overflow-hidden rounded-2xl border border-border bg-card">
          {selectedConversation && thread ? (
            <>
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                {selectedConversation.participant.avatarUrl ? (
                  <img
                    src={selectedConversation.participant.avatarUrl}
                    alt=""
                    className="size-10 rounded-full border border-border object-cover"
                    width={40}
                    height={40}
                  />
                ) : (
                  <div
                    className="flex size-10 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold text-muted-foreground"
                    aria-hidden
                  >
                    {selectedConversation.participant.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">
                      {selectedConversation.participant.name}
                    </p>
                    {selectedConversation.participant.isPremium ? (
                      <PremiumBadge className="text-[10px]" />
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Private direct messages
                  </p>
                </div>
                <div className="ml-auto">
                  {thread.conversation.blockedByMe ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={togglingBlock}
                      onClick={() => void handleToggleBlock(false)}
                    >
                      {togglingBlock ? "Updating…" : "Unblock"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={togglingBlock}
                      onClick={() => void handleToggleBlock(true)}
                    >
                      <Ban className="size-4" aria-hidden />
                      {togglingBlock ? "Blocking…" : "Block"}
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-muted/10 px-4 py-4">
                {thread.messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No messages yet. Say hello.
                  </p>
                ) : (
                  thread.messages.map((message) => {
                    const mine = message.senderId !== selectedConversation.participant.id;
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex",
                          mine ? "justify-end" : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                            mine
                              ? "bg-primary text-primary-foreground"
                              : "border border-border bg-background",
                          )}
                        >
                          {message.text ? (
                            <p className="whitespace-pre-wrap wrap-break-word">
                              {message.text}
                            </p>
                          ) : null}
                          {message.recipe ? (
                            <Link
                              href={`/recipes/${message.recipe.id}`}
                              className={cn(
                                "mt-2 block rounded-xl border p-3 transition-colors hover:bg-muted/40",
                                mine
                                  ? "border-primary-foreground/20 bg-primary-foreground/10"
                                  : "border-border bg-muted/20",
                              )}
                            >
                              {message.recipe.imageUrl ? (
                                <img
                                  src={message.recipe.imageUrl}
                                  alt=""
                                  className="mb-2 h-28 w-full rounded-lg object-cover"
                                />
                              ) : null}
                              <p className="text-xs uppercase tracking-wide opacity-80">
                                Recipe
                              </p>
                              <p className="font-medium">{message.recipe.title}</p>
                              <p
                                className={cn(
                                  "text-xs",
                                  mine
                                    ? "text-primary-foreground/80"
                                    : "text-muted-foreground",
                                )}
                              >
                                by {message.recipe.user.name}
                              </p>
                            </Link>
                          ) : null}
                          <p
                            className={cn(
                              "mt-1 text-[10px]",
                              mine
                                ? "text-primary-foreground/80"
                                : "text-muted-foreground",
                            )}
                          >
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-border p-4">
                {thread.conversation.blockedByMe ? (
                  <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                    You blocked this user. Unblock them to send messages.
                  </div>
                ) : null}
                {thread.conversation.blockedMe ? (
                  <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                    This user blocked you, so you cannot send messages.
                  </div>
                ) : null}
                {pendingRecipe ? (
                  <div className="mb-3 rounded-xl border border-border bg-muted/20 p-3">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Ready to send recipe
                        </p>
                        <p className="font-medium">{pendingRecipe.title}</p>
                        <p className="text-xs text-muted-foreground">
                          by {pendingRecipe.user.name}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Remove shared recipe"
                        onClick={() => setPendingRecipe(null)}
                      >
                        <X className="size-4" aria-hidden />
                      </button>
                    </div>
                    {pendingRecipe.imageUrl ? (
                      <img
                        src={pendingRecipe.imageUrl}
                        alt=""
                        className="h-32 w-full rounded-lg object-cover"
                      />
                    ) : null}
                  </div>
                ) : null}
                <label htmlFor="message-text" className="sr-only">
                  Message
                </label>
                <textarea
                  id="message-text"
                  className="min-h-24 w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                  placeholder={`Message ${selectedConversation.participant.name}…`}
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || e.shiftKey) return;
                    if (e.nativeEvent.isComposing) return;
                    e.preventDefault();
                    void handleSend();
                  }}
                  disabled={
                    thread.conversation.blockedByMe || thread.conversation.blockedMe
                  }
                />
                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      (!composerText.trim() && !pendingRecipe) ||
                      sending ||
                      thread.conversation.blockedByMe ||
                      thread.conversation.blockedMe
                    }
                    onClick={() => void handleSend()}
                  >
                    <SendHorizontal className="size-4" aria-hidden />
                    {sending
                      ? "Sending…"
                      : pendingRecipe
                        ? "Send recipe"
                        : "Send"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 py-12 text-center text-sm text-muted-foreground">
              Select a conversation to start messaging.
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
