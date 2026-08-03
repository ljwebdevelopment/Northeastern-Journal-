"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatViews } from "@/lib/format-views";

/**
 * Heart toggle for an article.
 *
 * The count is rendered from the server on first paint, then reconciled once
 * the browser reports back. Both halves of that state need the round trip:
 * whether *this* reader has liked it lives in an httpOnly cookie, and the
 * total on the page came out of a statically rendered, timer-revalidated
 * document, so it can easily be minutes stale. Correcting it on mount is what
 * makes a like look like it stuck when the reader returns.
 *
 * Clicks are optimistic: the heart fills and the number moves immediately,
 * and only rolls back if the request fails. A reader on a slow connection
 * should never be left wondering whether the tap registered.
 */
export function LikeButton({
  slug,
  initialCount,
  compact = false,
  className,
}: {
  slug: string;
  initialCount: number;
  /** Icon-height pill, for sitting in a row of round icon buttons. */
  compact?: boolean;
  className?: string;
}) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);
  const [pending, setPending] = useState(false);
  const [burst, setBurst] = useState(false);
  // A failed like used to roll back in silence, which is indistinguishable
  // from a button that does nothing — say what happened instead.
  const [error, setError] = useState<string | null>(null);
  // Guards against a double-click racing two opposite writes to the server.
  const inFlight = useRef(false);
  // Once the reader has clicked, their intent outranks a sync response that
  // was already in flight and therefore describes the state before the click.
  const touched = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/articles/${encodeURIComponent(slug)}/like`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.ok || touched.current) return;
        setLiked(Boolean(data.liked));
        if (typeof data.likes === "number") setCount(data.likes);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [slug]);

  const toggle = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    touched.current = true;

    const next = !liked;
    const previousCount = count;

    setError(null);
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    setPending(true);
    if (next) {
      setBurst(true);
      window.setTimeout(() => setBurst(false), 550);
    }

    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(slug)}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liked: next }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setLiked(!next);
        setCount(previousCount);
        setError(
          data?.reason === "not-installed"
            ? "Likes aren't switched on yet."
            : "Couldn't save that — try again."
        );
        return;
      }

      // Trust the server's total whenever it sends one — both when it applied
      // the change (another reader may have liked the same story meanwhile)
      // and when it declined to, where the optimistic bump was simply wrong.
      if (typeof data.likes === "number") setCount(data.likes);
      else if (data.changed === false) setCount(previousCount);
    } catch {
      setLiked(!next);
      setCount(previousCount);
      setError("Couldn't reach the server — try again.");
    } finally {
      setPending(false);
      inFlight.current = false;
    }
  }, [count, liked, slug]);

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={liked}
        aria-label={liked ? "Remove your like from this article" : "Like this article"}
        title={liked ? "You liked this" : "Like this article"}
        className={cn(
          "group inline-flex shrink-0 items-center rounded-full border font-semibold transition-colors",
          compact ? "h-9 gap-1.5 px-3 text-sm" : "gap-2 px-4 py-2 text-sm",
          liked
            ? "border-brand/40 bg-brand/10 text-brand"
            : "border-border text-muted hover:border-brand/50 hover:text-brand",
          pending && "opacity-70"
        )}
      >
        <span
          className={cn(
            "relative flex items-center justify-center",
            compact ? "h-4 w-4" : "h-5 w-5"
          )}
        >
          <Heart
            className={cn(
              "transition-transform duration-300",
              compact ? "h-4 w-4" : "h-[1.15rem] w-[1.15rem]",
              liked ? "scale-110 fill-current" : "group-hover:scale-110",
              burst && "animate-like-pop"
            )}
            aria-hidden
          />
          {/* Ring that expands and fades on the like, not the un-like. */}
          {burst && (
            <span
              className="animate-like-ring pointer-events-none absolute inset-0 rounded-full border-2 border-brand"
              aria-hidden
            />
          )}
        </span>
        <span className="tabular-nums">{formatViews(count)}</span>
        <span className="sr-only">{count === 1 ? "like" : "likes"}</span>
      </button>

      {/* Floated rather than inline so a failure doesn't reflow the row the
          button sits in. */}
      <span role="status" aria-live="polite" className="contents">
        {error && (
          <span className="absolute left-0 top-full z-10 mt-1.5 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted shadow-sm">
            {error}
          </span>
        )}
      </span>
    </span>
  );
}
