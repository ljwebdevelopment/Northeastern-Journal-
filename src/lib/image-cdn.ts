import { siteConfig } from "@/lib/site-config";

/**
 * Rewrites a stored image URL to go through this site's image optimizer.
 *
 * Article imagery lives in Supabase Storage, and Supabase bills every byte it
 * serves against one monthly egress allowance. Pages were already safe — they
 * render through `next/image`, so the CDN fetches each size once and serves
 * readers from its own bandwidth. Two paths were not: share-card metadata and
 * newsletter HTML both pointed crawlers and mail clients straight at Storage,
 * at full resolution, for every single fetch. A 1.4 MB lead photo delivered to
 * every subscriber — Apple Mail prefetches images whether or not the mail is
 * opened — exhausts the allowance quickly, and when it runs out Supabase
 * restricts the project and the whole site goes down with it.
 *
 * Routing those two through `/_next/image` moves the bytes onto the site's own
 * CDN: Storage is read once per size, then never again until the cache
 * expires. The same 1.4 MB photo leaves here as roughly 11 KB at thumbnail
 * width.
 *
 * Format negotiation is by `Accept` header, which makes this safe for the
 * clients that matter: browsers advertise AVIF/WebP and get them, while
 * crawlers and mail clients send `*&#47;*` and get the original format back.
 * Outlook never sees a WebP it cannot render, and X never sees the AVIF it
 * refuses to render.
 */

/**
 * Widths the optimizer will serve, from `images.deviceSizes` and
 * `images.imageSizes` in `next.config.ts`. Anything else is rejected with a
 * 400, so requested widths are snapped onto this ladder rather than passed
 * through. Keep in sync with the config.
 */
const ALLOWED_WIDTHS = [
  40, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920,
] as const;

/** Formats the optimizer refuses (SVG needs `dangerouslyAllowSVG`; GIF loses animation). */
const UNOPTIMIZABLE = /\.(svgz?|gif|ico)$/i;

/** Hosts allowed by `images.remotePatterns`. Anything else 400s, so pass it through. */
function isOptimizable(url: URL): boolean {
  if (UNOPTIMIZABLE.test(url.pathname)) return false;
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hosts = new Set(["picsum.photos", "img.youtube.com"]);
  if (supabase) {
    try {
      hosts.add(new URL(supabase).hostname);
    } catch {
      /* malformed env var — treated as no Supabase host */
    }
  }
  try {
    hosts.add(new URL(siteConfig.url).hostname);
  } catch {
    /* malformed site URL — same-origin images simply are not rewritten */
  }
  return hosts.has(url.hostname);
}

/** Smallest allowed width that still covers what the layout asks for. */
function snapWidth(width: number): number {
  return ALLOWED_WIDTHS.find((w) => w >= width) ?? ALLOWED_WIDTHS[ALLOWED_WIDTHS.length - 1];
}

/**
 * Absolute, optimized URL for `src` at `width` device pixels — or `src`
 * unchanged when it cannot be optimized (SVG, GIF, an unknown host, a
 * `data:` URL). Always returns something usable as an `<img src>`.
 *
 * `width` should be the size the image is *displayed* at, doubled for
 * retina where the context warrants it.
 */
export function cdnImage(
  src: string | null | undefined,
  width: number,
  quality = 75
): string | null {
  const trimmed = src?.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed, siteConfig.url);
  } catch {
    return trimmed;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return trimmed;
  if (!isOptimizable(url)) return url.toString();

  const params = new URLSearchParams({
    url: url.toString(),
    w: String(snapWidth(width)),
    q: String(quality),
  });
  return `${siteConfig.url.replace(/\/$/, "")}/_next/image?${params.toString()}`;
}
