/**
 * Controls how placeholder "demo" articles behave once a real CMS is
 * connected.
 *
 * - `showWhenRealContentExists`: if false (default), any category/listing
 *   that has at least one real (non-demo) article will drop demo articles
 *   from that listing automatically — real content silently replaces the
 *   showcase content as it's published, with no code changes required.
 * - `indexable`: if false (default), demo articles are marked `noindex`
 *   and excluded from the sitemap, so showcase content is never surfaced
 *   in search results. Flip `NEXT_PUBLIC_INDEX_DEMO_CONTENT=true` only for
 *   local previews where you want search engines (or crawlers) to see the
 *   demo pages.
 */
export const demoContentConfig = {
  showWhenRealContentExists: process.env.NEXT_PUBLIC_SHOW_DEMO_WITH_REAL_CONTENT === "true",
  indexable: process.env.NEXT_PUBLIC_INDEX_DEMO_CONTENT === "true",
};

export function resolveContent<T extends { isDemo?: boolean }>(items: T[]): T[] {
  const real = items.filter((item) => !item.isDemo);
  if (real.length > 0 && !demoContentConfig.showWhenRealContentExists) {
    return real;
  }
  return items;
}
