import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Records one read of an article.
 *
 * Counted from the browser rather than during server render: a render also
 * happens for prefetches, crawlers, and revalidation, none of which are
 * readers.
 *
 * The work is done by the `increment_article_view` function (migration
 * 0005), which runs security-definer and touches only `view_count`, and only
 * for published articles. The anon key alone can't write to `articles`.
 */
export const runtime = "nodejs";

/** How long before the same visitor can count the same article again. */
const REPEAT_WINDOW_HOURS = 6;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) return NextResponse.json({ ok: false }, { status: 400 });

  // A cookie per article keeps an ordinary reload from counting twice. It is
  // not a security control — the point is a count that means something, not
  // one that can't be gamed by someone determined.
  const cookieName = `njv_${slug}`.slice(0, 96);
  if (request.cookies.get(cookieName)) {
    return NextResponse.json({ ok: true, counted: false });
  }

  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });

  const { data, error } = await supabase.rpc("increment_article_view", {
    article_slug: slug,
  });

  if (error) {
    console.error("[views] increment failed", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  // Null means the slug matched nothing published.
  if (data === null) {
    return NextResponse.json({ ok: false, counted: false }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true, counted: true, views: data });
  response.cookies.set(cookieName, "1", {
    maxAge: REPEAT_WINDOW_HOURS * 60 * 60,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
