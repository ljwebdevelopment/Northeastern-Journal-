/**
 * Request-scoped "the backend is not answering" flag.
 *
 * The data layer deliberately degrades to empty lists when Supabase fails, so
 * one bad query never throws a whole page away. The cost is that a failed
 * fetch and a genuinely empty archive look identical to callers — and the
 * difference matters enormously to a reader. An empty archive means "nothing
 * published yet"; a failed fetch means "our articles exist but we cannot
 * reach them right now", and showing a 404 for the latter tells readers the
 * story is gone when it is not.
 *
 * `cache()` scopes the flag to a single render pass, so one request's outage
 * can never leak into another's. Nothing here is persisted: as soon as
 * Supabase answers again, pages render normally with no deploy or toggle.
 */
import { cache } from "react";

const outageState = cache(() => ({ degraded: false }));

/** Called by the data layer when a query fails for an infrastructural reason. */
export function markContentDegraded(): void {
  outageState().degraded = true;
}

/**
 * True when at least one content query failed during this render. Callers
 * should prefer a "technical difficulties" notice over a 404 or an
 * empty-archive message when this is set.
 */
export function isContentDegraded(): boolean {
  return outageState().degraded;
}
