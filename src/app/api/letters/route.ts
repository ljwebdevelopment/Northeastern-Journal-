import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/env";
import { checkEmail } from "@/lib/security/email-validation";
import { verifyCaptcha } from "@/lib/security/captcha";

/**
 * A letter to the editor.
 *
 * Same defences as newsletter signup, in the same order — honeypot, then
 * validation, then a Postgres-backed rate limit, then captcha — because this
 * is the other unauthenticated write path on the site and it accepts free
 * text, which makes it the more attractive of the two to abuse.
 *
 * Nothing published here is public until an editor approves it. The address is
 * required (an unverifiable letter isn't printable) and never shown: the
 * `letters_public` view leaves it out entirely.
 *
 * Runs with the service role because an anonymous visitor must be able to
 * write a row they can't read back.
 */

export const runtime = "nodejs";

const MAX_BODY = 6000;

export async function POST(request: NextRequest) {
  let payload: {
    name?: string;
    email?: string;
    location?: string;
    subject?: string;
    body?: string;
    articleSlug?: string;
    company?: string;
    captchaToken?: string;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  // Honeypot. Report success so a bot learns nothing from the response.
  if ((payload.company ?? "").trim()) {
    return NextResponse.json({ ok: true, message: "Thank you — your letter is with the editors." });
  }

  const name = (payload.name ?? "").trim();
  const body = (payload.body ?? "").trim();
  const subject = (payload.subject ?? "").trim().slice(0, 200);
  const location = (payload.location ?? "").trim().slice(0, 120) || null;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (name.length < 2) {
    return NextResponse.json(
      { ok: false, message: "Please give the name you'd like printed." },
      { status: 400 }
    );
  }
  if (body.length < 40) {
    return NextResponse.json(
      { ok: false, message: "Letters need to be at least a couple of sentences." },
      { status: 400 }
    );
  }
  if (body.length > MAX_BODY) {
    return NextResponse.json(
      { ok: false, message: `Letters are limited to ${MAX_BODY.toLocaleString()} characters.` },
      { status: 400 }
    );
  }

  const check = checkEmail(payload.email ?? "");
  if (!check.ok) {
    return NextResponse.json({ ok: false, message: check.message }, { status: 400 });
  }

  if (!hasServiceRole) {
    return NextResponse.json(
      { ok: false, message: "Letters aren't set up yet. Please try again later." },
      { status: 503 }
    );
  }

  const supabase = createAdminSupabase();

  const { data: ipAllowed } = await supabase.rpc("check_rate_limit", {
    limit_key: `letter:ip:${ip}`,
    max_hits: 3,
    window_seconds: 3600,
  });
  if (ipAllowed === false) {
    return NextResponse.json(
      { ok: false, message: "You've sent several letters recently. Please try again later." },
      { status: 429 }
    );
  }

  const captcha = await verifyCaptcha(payload.captchaToken, ip);
  if (!captcha.ok) {
    return NextResponse.json({ ok: false, message: captcha.message }, { status: 400 });
  }

  const { data: emailAllowed } = await supabase.rpc("check_rate_limit", {
    limit_key: `letter:email:${check.email}`,
    max_hits: 3,
    window_seconds: 86_400,
  });
  if (emailAllowed === false) {
    return NextResponse.json(
      { ok: false, message: "You've sent several letters recently. Please try again later." },
      { status: 429 }
    );
  }

  // Attach the article being answered, when there is one. A bad slug drops the
  // link rather than the letter — the writer's words matter more than the
  // cross-reference.
  let articleId: string | null = null;
  if (payload.articleSlug) {
    const { data: article } = await supabase
      .from("articles")
      .select("id")
      .eq("slug", payload.articleSlug)
      .eq("status", "published")
      .maybeSingle();
    articleId = article?.id ?? null;
  }

  const { error } = await supabase.from("letters").insert({
    name: name.slice(0, 120),
    email: check.email,
    location,
    subject,
    body,
    article_id: articleId,
    consent_ip: ip,
    consent_user_agent: request.headers.get("user-agent") ?? null,
  });

  if (error) {
    console.error("[letters] insert failed:", error.message);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message:
      "Thank you — your letter is with the editors. We read everything, and we'll be in touch if we plan to publish it.",
  });
}
