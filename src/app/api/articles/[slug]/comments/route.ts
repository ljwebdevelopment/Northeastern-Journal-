import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabase, createServerSupabase } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/env";
import { verifyCaptcha } from "@/lib/security/captcha";

/**
 * Reader comments on an article.
 *
 * GET  — the public thread, via `get_article_comments` (migration 0009). That
 *        function never selects `delete_token` or the request metadata, so
 *        there is no projection here that could leak them.
 *
 * POST — writes a comment via `add_article_comment` and returns the delete
 *        token exactly once, to the person who wrote it. Screening mirrors the
 *        newsletter signup, which is the site's other anonymous write path:
 *
 *          1. honeypot field — catches naive bots for free
 *          2. length validation (also enforced inside the function)
 *          3. rate limit per IP, in Postgres so it holds across instances
 *          4. captcha, when Turnstile or reCAPTCHA keys are configured
 *
 * There is no approval queue: a comment is public the moment it is written.
 */
export const runtime = "nodejs";

const MAX_NAME = 60;
const MAX_BODY = 4000;

const clientIp = (request: NextRequest) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ ok: true, comments: [] });

  const { data, error } = await supabase.rpc("get_article_comments", {
    article_slug: slug,
  });

  if (error) {
    console.error("[comments] read failed", error.message);
    return NextResponse.json({ ok: false, comments: [] }, { status: 500 });
  }

  return NextResponse.json({ ok: true, comments: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let payload: {
    name?: string;
    body?: string;
    parentId?: string | null;
    company?: string;
    captchaToken?: string;
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  // 1. Honeypot. Report success so a bot learns nothing from the response.
  if ((payload.company ?? "").trim()) {
    return NextResponse.json({ ok: true, comment: null });
  }

  // 2. Validation first: pure CPU, and a blank field shouldn't spend the
  // caller's rate-limit budget.
  const name = (payload.name ?? "").trim();
  const body = (payload.body ?? "").trim();

  if (name.length < 1 || name.length > MAX_NAME) {
    return NextResponse.json(
      { ok: false, message: `Please enter a name of up to ${MAX_NAME} characters.` },
      { status: 400 }
    );
  }
  if (body.length < 1 || body.length > MAX_BODY) {
    return NextResponse.json(
      { ok: false, message: `Comments can be up to ${MAX_BODY.toLocaleString()} characters.` },
      { status: 400 }
    );
  }

  const ip = clientIp(request);

  // 3. Rate limit by IP. Needs the service role: `rate_limits` has no policies,
  // so only a client that bypasses RLS can touch it.
  if (hasServiceRole) {
    const admin = createAdminSupabase();
    const { data: allowed } = await admin.rpc("check_rate_limit", {
      limit_key: `comment:ip:${ip}`,
      max_hits: 8,
      window_seconds: 600,
    });
    if (allowed === false) {
      return NextResponse.json(
        { ok: false, message: "You're commenting quickly. Please try again in a few minutes." },
        { status: 429 }
      );
    }
  }

  // 4. Captcha (skipped when no provider is configured).
  const captcha = await verifyCaptcha(payload.captchaToken, ip);
  if (!captcha.ok) {
    return NextResponse.json({ ok: false, message: captcha.message }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Comments aren't available right now." },
      { status: 503 }
    );
  }

  const { data, error } = await supabase.rpc("add_article_comment", {
    article_slug: slug,
    comment_author: name,
    comment_body: body,
    reply_to: payload.parentId ?? null,
    ip,
    user_agent: request.headers.get("user-agent") ?? null,
  });

  const created = data?.[0];
  if (error || !created) {
    console.error("[comments] insert failed", error?.message);
    return NextResponse.json(
      { ok: false, message: "Could not post your comment." },
      { status: 500 }
    );
  }

  // The delete token is returned here and nowhere else. The browser stores it
  // so the author can remove their own comment later.
  return NextResponse.json({
    ok: true,
    comment: {
      id: created.id,
      // The resolved parent, not the requested one — replying to a reply
      // attaches to its top-level ancestor.
      parent_id: created.parent_id,
      author_name: name,
      body,
      is_deleted: false,
      created_at: created.created_at,
    },
    deleteToken: created.delete_token,
  });
}
