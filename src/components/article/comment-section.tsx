"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { MessageSquare, Trash2 } from "lucide-react";
import type { PublicCommentRow } from "@/lib/supabase/types";
import { cn, relativeTime } from "@/lib/utils";

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

/** The delete tokens this browser holds, keyed by comment id. */
function useStoredTokens(): Tokens {
  const raw = useSyncExternalStore(
    subscribeToStorage,
    () => readRaw(TOKENS_KEY, "{}"),
    () => "{}"
  );
  return useMemo(() => {
    try {
      return JSON.parse(raw) as Tokens;
    } catch {
      return {};
    }
  }, [raw]);
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
  const tokens = useStoredTokens();

  // Top-level comments, each with its replies. One level deep — the API
  // collapses a reply-to-a-reply onto its ancestor, so this never recurses.
  const threads = useMemo(() => {
    const roots = comments.filter((c) => !c.parent_id);
    const repliesByParent = new Map<string, PublicCommentRow[]>();
    for (const c of comments) {
      if (!c.parent_id) continue;
      const list = repliesByParent.get(c.parent_id) ?? [];
      list.push(c);
      repliesByParent.set(c.parent_id, list);
    }
    return roots.map((root) => ({ root, replies: repliesByParent.get(root.id) ?? [] }));
  }, [comments]);

  // Deleted comments still occupy a slot in the thread, but shouldn't be
  // counted as part of the conversation.
  const liveCount = comments.filter((c) => !c.is_deleted).length;

  function handlePosted(comment: PublicCommentRow, token: string) {
    setComments((prev) => [...prev, comment]);
    setReplyTo(null);
    writeRaw(TOKENS_KEY, JSON.stringify({ ...tokens, [comment.id]: token }));
  }

  async function handleDelete(id: string) {
    const token = tokens[id];
    if (!token) return;
    if (!window.confirm("Remove your comment? This can't be undone.")) return;

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

    const next = { ...tokens };
    delete next[id];
    writeRaw(TOKENS_KEY, JSON.stringify(next));
  }

  return (
    <section
      id="comments"
      aria-labelledby="comments-heading"
      className="mx-auto mt-16 max-w-[38rem] border-t border-border pt-10"
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
        <ol className="mt-10 flex flex-col divide-y divide-border border-t border-border">
          {threads.map(({ root, replies }) => (
            <li key={root.id} className="py-6">
              <CommentBody
                comment={root}
                canDelete={Boolean(tokens[root.id]) && !root.is_deleted}
                onDelete={() => handleDelete(root.id)}
                onReply={() => setReplyTo(replyTo === root.id ? null : root.id)}
                replying={replyTo === root.id}
              />

              {replies.length > 0 && (
                <ol className="mt-5 flex flex-col gap-5 border-l-2 border-border pl-5">
                  {replies.map((reply) => (
                    <li key={reply.id}>
                      <CommentBody
                        comment={reply}
                        canDelete={Boolean(tokens[reply.id]) && !reply.is_deleted}
                        onDelete={() => handleDelete(reply.id)}
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
                    onCancel={() => setReplyTo(null)}
                  />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** One comment: byline, timestamp, text, and its actions. */
function CommentBody({
  comment,
  canDelete,
  onDelete,
  onReply,
  replying,
}: {
  comment: PublicCommentRow;
  canDelete: boolean;
  onDelete: () => void;
  onReply?: () => void;
  replying?: boolean;
}) {
  return (
    <article className={cn(comment.is_deleted && "opacity-60")}>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="font-serif text-base font-bold">{comment.author_name}</span>
        <time dateTime={comment.created_at} className="text-xs text-muted">
          {relativeTime(comment.created_at)}
        </time>
      </div>

      <p
        className={cn(
          "mt-2 whitespace-pre-wrap text-[0.9375rem] leading-relaxed",
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
              onClick={onReply}
              className="text-xs font-semibold text-muted transition-colors hover:text-brand"
            >
              {replying ? "Cancel" : "Reply"}
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted transition-colors hover:text-brand"
            >
              <Trash2 className="h-3 w-3" aria-hidden /> Delete
            </button>
          )}
        </div>
      )}
    </article>
  );
}

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

      {error && (
        <p role="alert" className="mt-3 text-sm text-brand">
          {error}
        </p>
      )}

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {body.length > MAX_BODY - 200
            ? `${(MAX_BODY - body.length).toLocaleString()} characters left`
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
            disabled={submitting}
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Posting…" : replyingTo ? "Post reply" : "Post comment"}
          </button>
        </div>
      </div>
    </form>
  );
}
