import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createAdminSupabase, CONTENT_CACHE_TAG } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/env";
import { sendArticleAnnouncement } from "@/lib/email/send";
import { emailConfig } from "@/lib/email/resend";

/**
 * Publishes any article whose scheduled time has passed, then emails the ones
 * that asked for an announcement.
 *
 * Wired to Vercel Cron in `vercel.json`. Vercel sends CRON_SECRET as a bearer
 * token; requests without it are rejected so the endpoint can't be triggered
 * by anyone who finds the URL.
 *
 * The schedule is once daily (`0 11 * * *`) because the Vercel Hobby plan
 * rejects any deployment whose cron runs more often than that. On Pro, change
 * it in vercel.json to a five-minute interval. This endpoint is also safe to
 * call by hand at any time.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (!secret) {
    return NextResponse.json(
      { ok: false, message: "CRON_SECRET is not configured." },
      { status: 503 }
    );
  }
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  if (!hasServiceRole) {
    return NextResponse.json(
      { ok: false, message: "SUPABASE_SERVICE_ROLE_KEY is not configured." },
      { status: 503 }
    );
  }

  const supabase = createAdminSupabase();

  // Flips due articles to published and hands back the rows it changed.
  const { data: published, error } = await supabase.rpc("publish_due_articles");

  if (error) {
    console.error("[cron] publish_due_articles failed:", error.message);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  const rows = published ?? [];
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, published: 0, notified: 0 });
  }

  // Route handlers can't use `updateTag`; expire the tag outright instead.
  revalidateTag(CONTENT_CACHE_TAG, "max");
  revalidatePath("/", "layout");

  // Announce the ones that opted in and haven't been announced already.
  let notified = 0;
  for (const article of rows) {
    if (!article.notify_subscribers || article.notified_at) continue;

    const { data: joined } = await supabase
      .from("articles")
      .select("category:categories(slug, name), author:authors(name)")
      .eq("id", article.id)
      .maybeSingle();

    const category = joined?.category as unknown as { slug: string; name: string } | null;
    const author = joined?.author as unknown as { name: string } | null;

    // Stamp first so a retried cron run can't double-send.
    await supabase
      .from("articles")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", article.id);

    const result = await sendArticleAnnouncement({
      articleId: article.id,
      title: article.title,
      excerpt: article.excerpt,
      url: `${emailConfig.siteUrl}/article/${category?.slug ?? "local-news"}/${article.slug}`,
      imageUrl: article.featured_image_url,
      imageAlt: article.featured_image_alt ?? article.title,
      authorName: author?.name ?? null,
      publishedAt: article.published_at ?? new Date().toISOString(),
      categoryName: category?.name ?? null,
      categorySlug: category?.slug ?? null,
      readingMinutes: article.reading_minutes,
    });

    if (result.sent > 0) {
      notified += 1;
    } else {
      // Nothing went out — clear the stamp so it can be retried next run.
      await supabase.from("articles").update({ notified_at: null }).eq("id", article.id);
      console.error("[cron] announcement failed:", result.message);
    }
  }

  return NextResponse.json({
    ok: true,
    published: rows.length,
    notified,
    slugs: rows.map((r) => r.slug),
  });
}
