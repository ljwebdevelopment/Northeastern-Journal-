"use client";

import { useEffect } from "react";

/**
 * Registers a read once the article is open in a real browser.
 *
 * Deduped per session here and again by a short-lived cookie on the server,
 * so reloading an article doesn't inflate its count.
 */
export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `nj:viewed:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage blocked (private mode). The server cookie still dedupes.
    }

    const controller = new AbortController();
    fetch(`/api/articles/${encodeURIComponent(slug)}/view`, {
      method: "POST",
      signal: controller.signal,
    }).catch(() => undefined);

    return () => controller.abort();
  }, [slug]);

  return null;
}
