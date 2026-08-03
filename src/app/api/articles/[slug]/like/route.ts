import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Toggles one reader's like on an article.
 *
 * The work is done by `set_article_like` (migration 0009), which runs
 * security-definer, touches only `like_count`, and only for published
 * articles. The anon key alone can't write to `articles`.
 *
 * A per-article cookie holds the current state, which is what stops a reader
 * from clicking the heart fifty times and adding fifty likes: the server only
 * applies a change when the requested state differs from the cookie. Like the
 * view counter, this is an honesty mechanism rather than a security control —
 * the cookie is `httpOnly` so page scripts can't forge it, but someone
 * determined can still clear it. The blast radius is a vanity number on a
 * story the public can already read.
 *
 * Both verbs return the live total. The article page is statically rendered
 * and revalidated on a timer, so the count baked into its HTML is routinely
 * minutes old — without a fresh number here, a reader who liked a story and
 * came back would see their like apparently undone.
 */
export const runtime = "nodejs";
/** Reads a cookie and the live count; never cacheable. */
export const dynamic = "force-dynamic";

/**
 * Cookie names may not contain separators, so the slug is filtered rather than
 * interpolated raw. Article slugs are already url-safe, which makes this a
 * no-op in practice and a guard against the one that isn't.
 */
const cookieNameFor = (slug: string) =>
  `njl_${slug.replace(/[^A-Za-z0-9_-]/g, "")}`.slice(0, 96);

/** A year — a like is a lasting opinion, not a session. */
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

type Supabase = NonNullable<Awaited<ReturnType<typeof createServerSupabase>>>;

/**
 * The article's current like total, or null when the slug matches nothing
 * published. Read directly rather than through the cached content client so
 * it reflects writes from a second ago.
 */
async function readLikeCount(supabase: Supabase, slug: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("articles")
    .select("like_count")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    // Migration 0009 not run yet: the column is missing. Not fatal — the page
    // keeps its server-rendered number.
    console.error("[likes] count read failed", error.message);
    return null;
  }
  return data ? (data.like_count ?? 0) : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) return NextResponse.json({ ok: false }, { status: 400, headers: NO_STORE });

  let liked: boolean;
  try {
    const payload = (await request.json()) as { liked?: unknown };
    if (typeof payload.liked !== "boolean") {
      return NextResponse.json({ ok: false }, { status: 400, headers: NO_STORE });
    }
    liked = payload.liked;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400, headers: NO_STORE });
  }

  const cookieName = cookieNameFor(slug);
  const alreadyLiked = request.cookies.get(cookieName)?.value === "1";

  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503, headers: NO_STORE });

  // Requested state already holds. Report success without touching the count,
  // so a double-click or a retried request is a no-op — but still send the
  // real total, because the caller may have optimistically counted the click.
  if (alreadyLiked === liked) {
    const likes = await readLikeCount(supabase, slug);
    return NextResponse.json(
      { ok: true, changed: false, liked, ...(likes === null ? {} : { likes }) },
      { headers: NO_STORE }
    );
  }

  const { data, error } = await supabase.rpc("set_article_like", {
    article_slug: slug,
    liked,
  });

  if (error) {
    console.error("[likes] toggle failed", error.message);
    return NextResponse.json({ ok: false }, { status: 500, headers: NO_STORE });
  }
  // Null means the slug matched nothing published.
  if (data === null) {
    return NextResponse.json({ ok: false, changed: false }, { status: 404, headers: NO_STORE });
  }

  const response = NextResponse.json(
    { ok: true, changed: true, liked, likes: data },
    { headers: NO_STORE }
  );
  if (liked) {
    response.cookies.set(cookieName, "1", {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  } else {
    response.cookies.set(cookieName, "", { maxAge: 0, path: "/" });
  }
  return response;
}

/**
 * Whether this browser has already liked the article, and the live total.
 * Both drive the button's initial state: the heart's fill comes from the
 * cookie, and the number corrects whatever the cached page shipped.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const liked = request.cookies.get(cookieNameFor(slug))?.value === "1";

  const supabase = await createServerSupabase();
  const likes = supabase ? await readLikeCount(supabase, slug) : null;

  return NextResponse.json(
    { ok: true, liked, ...(likes === null ? {} : { likes }) },
    { headers: NO_STORE }
  );
}
