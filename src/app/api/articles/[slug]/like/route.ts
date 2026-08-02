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
 */
export const runtime = "nodejs";

const cookieNameFor = (slug: string) => `njl_${slug}`.slice(0, 96);

/** A year — a like is a lasting opinion, not a session. */
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) return NextResponse.json({ ok: false }, { status: 400 });

  let liked: boolean;
  try {
    const payload = (await request.json()) as { liked?: unknown };
    if (typeof payload.liked !== "boolean") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    liked = payload.liked;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const cookieName = cookieNameFor(slug);
  const alreadyLiked = request.cookies.get(cookieName)?.value === "1";

  // Requested state already holds. Report success without touching the count,
  // so a double-click or a retried request is a no-op.
  if (alreadyLiked === liked) {
    return NextResponse.json({ ok: true, changed: false, liked });
  }

  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });

  const { data, error } = await supabase.rpc("set_article_like", {
    article_slug: slug,
    liked,
  });

  if (error) {
    console.error("[likes] toggle failed", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  // Null means the slug matched nothing published.
  if (data === null) {
    return NextResponse.json({ ok: false, changed: false }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true, changed: true, liked, likes: data });
  if (liked) {
    response.cookies.set(cookieName, "1", {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  } else {
    response.cookies.delete(cookieName);
  }
  return response;
}

/** Whether this browser has already liked the article. Drives initial state. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  return NextResponse.json({
    ok: true,
    liked: request.cookies.get(cookieNameFor(slug))?.value === "1",
  });
}
