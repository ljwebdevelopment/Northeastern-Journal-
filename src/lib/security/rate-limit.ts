/**
 * Fixed-window rate limiting backed by the shared store, so limits hold
 * across instances when a KV driver is configured and still work locally
 * with the file/memory driver.
 */
import { headers } from "next/headers";
import { getStore } from "@/lib/store/driver";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the current window resets. */
  retryAfter: number;
}

interface Window {
  count: number;
  /** Epoch ms when the window expires. */
  resetAt: number;
}

export async function rateLimit(
  key: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number }
): Promise<RateLimitResult> {
  const store = getStore();
  const storeKey = `ratelimit:${key}`;
  const now = Date.now();

  let window = await store.get<Window>(storeKey);
  if (!window || window.resetAt <= now) {
    window = { count: 0, resetAt: now + windowSeconds * 1000 };
  }

  window.count += 1;
  await store.set(storeKey, window);

  const retryAfter = Math.max(1, Math.ceil((window.resetAt - now) / 1000));
  return {
    allowed: window.count <= limit,
    remaining: Math.max(0, limit - window.count),
    retryAfter,
  };
}

/**
 * Best-effort client IP. Behind Vercel/Cloudflare the leftmost
 * `x-forwarded-for` entry is the real client; falls back to a constant so
 * a missing header degrades to a shared (stricter) bucket rather than an
 * unlimited one.
 */
export async function clientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return (
    headerList.get("cf-connecting-ip") ??
    headerList.get("x-real-ip") ??
    "unknown"
  );
}
