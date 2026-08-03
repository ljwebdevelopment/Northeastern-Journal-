"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { MessageSquare, Trash2 } from "lucide-react";
import type { PublicCommentRow } from "@/lib/supabase/types";
import { CaptchaWidget, captchaEnabled } from "@/components/shared/captcha-widget";
import { cn, formatDate, relativeTime } from "@/lib/utils";

/**
 * Reader comments for one article.
 *
 * Rendered from a server-fetched thread so the comments are in the initial
 * HTML — they are real content and should be crawlable, not a client-side
 * afterthought that appears a second later.
 *
 * Identity is a display name and nothing else. What makes "delete your own
 * comment" work without accounts is a token the server issues once, at
 * creation, which is kept in localStorage. Anyone holding the token can
 * delete that comment; since it never leaves the author's browser, in
 * practice that is the author on the device they wrote it from.
 */

const MAX_NAME = 60;
const MAX_BODY = 4000;

/** Threads shown before "show all" — a busy story shouldn't cost a long scroll. */
const VISIBLE_THREADS = 8;

/** localStorage keys: the remembered display name, and the delete tokens. */
const NAME_KEY = "nj:comment-name";
const TOKENS_KEY = "nj:comment-tokens";

type Tokens = Record<string, string>;

/**
 * localStorage is read through `useSyncExternalStore` rather than an effect.
 * Reading it during render would break hydration (the server has no such
 * value), and reading it in an effect means a second render pass plus a
 * visible flash. This gives React an explicit server snapshot instead.
 *
 * Snapshots are the raw strings, not parsed objects: `getSnapshot` has to
 * return something referentially stable or React re-renders forever, and a
 * fresh `JSON.parse` object never is. Parsing happens in a `useMemo`.
 */
const STORAGE_EVENT = "nj:comment-storage";

function subscribeToStorage(callback: () => void) {
  // `storage` covers other tabs; the custom event covers this one, which the
  // browser deliberately does not notify about its own writes.
  window.addEventListener("storage", callback);
  window.addEventListener(STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

function readRaw(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    // Storage blocked (private mode).
    return fallback;
  }
}

function writeRaw(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    window.dispatchEvent(new Event(STORAGE_EVENT));
  } catch {
    // Storage blocked. The comment still posts; the author just won't be
    // able to delete it later from this browser.
  }
}

function parseTokens(raw: string): Tokens {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Tokens) : {};
  } catch {
    return {};
  }
}

/**
 * Merges into the stored tokens, re-reading storage first rather than merging
 * into a value captured in a closure. Two comments posted in quick succession
 * both render from the same snapshot, and a closure merge would drop the
 * first token — which is the reader's only claim on their own comment.
 */
function updateTokens(mutate: (prev: Tokens) => Tokens) {
  writeRaw(TOKENS_KEY, JSON.stringify(mutate(parseTokens(readRaw(TOKENS_KEY, "{}")))));
}

/** The delete tokens this browser holds, keyed by comment id. */
function useStoredTokens(): Tokens {
  const raw = useSyncExternalStore(
    subscribeToStorage,
    () => readRaw(TOKENS_KEY, "{}"),
    () => "{}"
  );
  return useMemo(() => parseTokens(raw), [raw]);
}

export function CommentSection({
  slug,
  initialComments,
}: {
  slug: string;
  initialComments: PublicCommentRow[];
}) {
  const [comments, setComments] = useState(initialComments);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  // The comment this reader just wrote, held in a ref: it exists only to
  // drive one scroll after the list renders, and nothing displays it.
  const pendingScroll = useRef<string | null>(null);
  const tokens = useStoredTokens();

  // Top-level comments, each with its replies, plus the live count. One level
  // deep — the API collapses a reply-to-a-reply onto its ancestor, so this
  // never recurses. Deleted comments keep their slot in the thread but aren't
  // counted as part of the conversation.
  const { threads, liveCount } = useMemo(() => {
    const roots: PublicCommentRow[] = [];
    const repliesByParent = new Map<string, PublicCommentRow[]>();
    let live = 0;

    for (const c of comments) {
      if (!c.is_deleted) live += 1;
      if (!c.parent_id) {
        roots.push(c);
        continue;
      }
      const list = repliesByParent.get(c.parent_id);
      if (list) list.push(c);
      else repliesByParent.set(c.parent_id, [c]);
    }

    return {
      liveCount: live,
      threads: roots.map((root) => ({ root, replies: repliesByParent.get(root.id) ?? [] })),
    };
  }, [comments]);

  const visibleThreads = showAll ? threads : threads.slice(0, VISIBLE_THREADS);
  const hiddenCount = threads.length - visibleThreads.length;

  // Bring the reader to their own comment — a new top-level one lands at the
  // bottom of a long thread, well past the form they submitted from.
  useEffect(() => {
    const id = pendingScroll.current;
    if (!id) return;
    pendingScroll.current = null;
    document
      .getElementById(`comment-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [comments]);

  const handlePosted = useCallback((comment: PublicCommentRow, token: string) => {
    setComments((prev) => [...prev, comment]);
    setReplyTo(null);
    // Once you've contributed, you should be able to see the whole thread
    // your comment landed in.
    setShowAll(true);
    pendingScroll.current = comment.id;
    if (token) updateTokens((prev) => ({ ...prev, [comment.id]: token }));
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const token = parseTokens(readRaw(TOKENS_KEY, "{}"))[id];
    if (!token) return;

    const res = await fetch(`/api/comments/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => null);

    if (!res?.ok) return;

    setComments((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              is_deleted: true,
              author_name: "[removed]",
              body: "This comment was removed by its author.",
            }
          : c
      )
    );

    updateTokens((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleReply = useCallback((id: string) => {
    setReplyTo((current) => (current === id ? null : id));
  }, []);

  const clearReply = useCallback(() => setReplyTo(null), []);

  return (
    <section
      id="comments"
      aria-labelledby="comments-heading"
      className="mx-auto mt-16 max-w-[38rem] scroll-mt-24 border-t border-border pt-10"
    >
      <h2 id="comments-heading" className="flex items-center gap-2.5 font-serif text-2xl font-bold">
        <MessageSquare className="h-5 w-5 text-brand" aria-hidden />
        {liveCount === 0
          ? "Comments"
          : `${liveCount} ${liveCount === 1 ? "Comment" : "Comments"}`}
      </h2>
      <p className="mt-2 text-sm text-muted">
        Join the conversation. Comments are public and appear right away —
        please keep them civil and on topic.
      </p>

      <div className="mt-7">
        <CommentForm slug={slug} onPosted={handlePosted} />
      </div>

      {threads.length === 0 ? (
        <p className="mt-10 border-t border-border pt-8 text-center text-sm text-muted">
          No comments yet. Be the first to respond.
        </p>
      ) : (
        <>
          <ol className="mt-10 flex flex-col divide-y divide-border border-t border-border">
            {visibleThreads.map(({ root, replies }) => (
              <li key={root.id} id={`comment-${root.id}`} className="scroll-mt-24 py-6">
                <CommentBody
                  comment={root}
                  canDelete={Boolean(tokens[root.id]) && !root.is_deleted}
                  onDelete={handleDelete}
                  onReply={handleReply}
                  replying={replyTo === root.id}
                />

                {replies.length > 0 && (
                  <ol className="mt-5 flex flex-col gap-5 border-l-2 border-border pl-5">
                    {replies.map((reply) => (
                      <li key={reply.id} id={`comment-${reply.id}`} className="scroll-mt-24">
                        <CommentBody
                          comment={reply}
                          canDelete={Boolean(tokens[reply.id]) && !reply.is_deleted}
                          onDelete={handleDelete}
                        />
                      </li>
                    ))}
                  </ol>
                )}

                {replyTo === root.id && (
                  <div className="mt-5 border-l-2 border-brand/40 pl-5">
                    <CommentForm
                      slug={slug}
                      parentId={root.id}
                      replyingTo={root.author_name}
                      onPosted={handlePosted}
                      onCancel={clearReply}
                    />
                  </div>
                )}
              </li>
            ))}
          </ol>

          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-6 w-full rounded-full border border-border py-2.5 text-sm font-semibold text-muted transition-colors hover:border-brand hover:text-brand"
            >
              Show {hiddenCount} more {hiddenCount === 1 ? "comment" : "comments"}
            </button>
          )}
        </>
      )}
    </section>
  );
}

/**
 * A comment's age.
 *
 * Rendered absolute first and swapped to relative after mount. The server's
 * "3 minutes ago" is computed when the page is generated, not when it is
 * read, so on a cached page it is both wrong and a hydration mismatch; the
 * absolute date is stable across both passes.
 *
 * The swap is a `useSyncExternalStore` with no store behind it — an age never
 * changes in response to anything, it just needs a client reading and a
 * server reading, which is precisely what the two snapshots give.
 */
const subscribeToNothing = () => () => {};

function TimeStamp({ iso }: { iso: string }) {
  const label = useSyncExternalStore(
    subscribeToNothing,
    () => relativeTime(iso),
    () => formatDate(iso)
  );

  return (
    <time dateTime={iso} className="text-xs text-muted">
      {label}
    </time>
  );
}

/**
 * One comment: byline, timestamp, text, and its actions.
 *
 * Memoised, and given id-taking callbacks rather than freshly bound closures,
 * so typing in the form or opening a reply box doesn't re-render every
 * comment on the page.
 */
const CommentBody = memo(function CommentBody({
  comment,
  canDelete,
  onDelete,
  onReply,
  replying,
}: {
  comment: PublicCommentRow;
  canDelete: boolean;
  onDelete: (id: string) => void;
  onReply?: (id: string) => void;
  replying?: boolean;
}) {
  // Two-step delete instead of `window.confirm`, which blocks the page and
  // looks like a browser error rather than part of the site.
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = window.setTimeout(() => setConfirming(false), 5000);
    return () => window.clearTimeout(timer);
  }, [confirming]);

  return (
    <article className={cn(comment.is_deleted && "opacity-60")}>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="font-serif text-base font-bold">{comment.author_name}</span>
        <TimeStamp iso={comment.created_at} />
      </div>

      <p
        className={cn(
          "mt-2 whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed",
          comment.is_deleted ? "italic text-muted" : "text-foreground/90"
        )}
      >
        {comment.body}
      </p>

      {!comment.is_deleted && (onReply || canDelete) && (
        <div className="mt-2.5 flex items-center gap-4">
          {onReply && (
            <button
              type="button"
              onClick={() => onReply(comment.id)}
              aria-expanded={Boolean(replying)}
              className="text-xs font-semibold text-muted transition-colors hover:text-brand"
            >
              {replying ? "Cancel" : "Reply"}
            </button>
          )}
          {canDelete &&
            (confirming ? (
              <span className="flex items-center gap-3 text-xs">
                <span className="text-muted">Remove this?</span>
                <button
                  type="button"
                  onClick={() => onDelete(comment.id)}
                  className="font-semibold text-brand hover:underline"
                >
                  Yes, remove
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="font-semibold text-muted hover:text-foreground"
                >
                  Keep
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-muted transition-colors hover:text-brand"
              >
                <Trash2 className="h-3 w-3" aria-hidden /> Delete
              </button>
            ))}
        </div>
      )}
    </article>
  );
});

/** The write box. Used for both top-level comments and replies. */
function CommentForm({
  slug,
  parentId,
  replyingTo,
  onPosted,
  onCancel,
}: {
  slug: string;
  parentId?: string;
  replyingTo?: string;
  onPosted: (comment: PublicCommentRow, token: string) => void;
  onCancel?: () => void;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Returning readers shouldn't retype their name every time. The saved value
  // seeds the field; once the reader edits it, their edit takes over. Splitting
  // it this way keeps the stored value out of render-time localStorage access
  // while leaving the input fully controlled.
  const savedName = useSyncExternalStore(
    subscribeToStorage,
    () => readRaw(NAME_KEY, ""),
    () => ""
  );
  const [editedName, setEditedName] = useState<string | null>(null);
  const name = editedName ?? savedName;
  const setName = setEditedName;

  // A reply box is opened deliberately, so put the cursor in it.
  useEffect(() => {
    if (parentId) bodyRef.current?.focus();
  }, [parentId]);

  const onToken = useCallback((token: string) => setCaptchaToken(token), []);

  const remaining = MAX_BODY - body.length;
  const empty = !name.trim() || !body.trim();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const trimmedName = name.trim();
    const trimmedBody = body.trim();
    if (!trimmedName || !trimmedBody) {
      setError("Please add your name and a comment.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const form = event.currentTarget;
    const honeypot = (form.elements.namedItem("company") as HTMLInputElement | null)?.value ?? "";

    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          body: trimmedBody,
          parentId: parentId ?? null,
          company: honeypot,
          // The route verifies this whenever Turnstile or reCAPTCHA keys are
          // configured; without it, every comment is rejected on a site that
          // has bot protection switched on.
          captchaToken,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.message ?? "Could not post your comment.");
        return;
      }

      writeRaw(NAME_KEY, trimmedName);

      // A honeypot hit returns ok with no comment; nothing to append.
      if (data.comment) onPosted(data.comment, data.deleteToken);
      setBody("");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface p-5">
      {replyingTo && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Replying to {replyingTo}
        </p>
      )}

      <label htmlFor={`comment-name-${parentId ?? "root"}`} className="sr-only">
        Your name
      </label>
      <input
        id={`comment-name-${parentId ?? "root"}`}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={MAX_NAME}
        placeholder="Your name"
        autoComplete="name"
        required
        className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-brand"
      />

      <label htmlFor={`comment-body-${parentId ?? "root"}`} className="sr-only">
        Your comment
      </label>
      <textarea
        id={`comment-body-${parentId ?? "root"}`}
        ref={bodyRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={MAX_BODY}
        rows={parentId ? 3 : 4}
        placeholder={replyingTo ? `Write a reply…` : "Share your perspective…"}
        required
        className="mt-3 w-full resize-y rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted focus:border-brand"
      />

      {/* Honeypot: hidden from people, tempting to naive bots. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      {captchaEnabled && (
        <div className="mt-3">
          <CaptchaWidget onToken={onToken} action="article_comment" />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-brand">
          {error}
        </p>
      )}

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {remaining < 200
            ? `${remaining.toLocaleString()} characters left`
            : "Your name is shown publicly."}
        </p>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || empty}
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Posting…" : replyingTo ? "Post reply" : "Post comment"}
          </button>
        </div>
      </div>
    </form>
  );
}
