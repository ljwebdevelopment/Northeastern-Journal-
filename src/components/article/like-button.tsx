"use client";

import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatViews } from "@/lib/format-views";

/**
 * Heart toggle for an article.
 *
 * The count is rendered from the server on first paint, then corrected once
 * the browser reports whether *this* reader has already liked it — that state
 * lives in an httpOnly cookie, so the server component can't know it without
 * making the whole page uncacheable.
 *
 * Clicks are optimistic: the heart fills and the number moves immediately,
 * and only rolls back if the request fails. A reader on a slow connection
 * should never be left wondering whether the tap registered.
 */
export function LikeButton({
  slug,
  initialCount,
  className,
}: {
  slug: string;
  initialCount: number;
  className?: string;
}) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);
  const [pending, setPending] = useState(false);
  const [burst, setBurst] = useState(false);
  // Guards against a double-click racing two opposite writes to the server.
  const inFlight = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/articles/${encodeURIComponent(slug)}/like`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.ok) setLiked(Boolean(data.liked));
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [slug]);

  async function toggle() {
    if (inFlight.current) return;
    inFlight.current = true;

    const next = !liked;
    const previousCount = count;

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
      const data = await res.json();

      if (!res.ok || !data.ok) throw new Error("rejected");
      // Trust the server's total when it applied a change; another reader may
      // have liked the same story while this one was deciding.
      if (typeof data.likes === "number") setCount(data.likes);
    } catch {
      setLiked(!next);
      setCount(previousCount);
    } finally {
      setPending(false);
      inFlight.current = false;
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? "Remove your like from this article" : "Like this article"}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
        liked
          ? "border-brand/40 bg-brand/10 text-brand"
          : "border-border text-muted hover:border-brand/50 hover:text-brand",
        pending && "opacity-70",
        className
      )}
    >
      <span className="relative flex h-5 w-5 items-center justify-center">
        <Heart
          className={cn(
            "h-[1.15rem] w-[1.15rem] transition-transform duration-300",
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
  );
}
