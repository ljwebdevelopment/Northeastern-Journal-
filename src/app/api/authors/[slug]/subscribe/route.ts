import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/env";
import { sendWelcomeEmail } from "@/lib/email/send";
import { checkEmail } from "@/lib/security/email-validation";
import { verifyCaptcha } from "@/lib/security/captcha";

/**
 * Follow a single journalist.
 *
 * Runs the same screening as the newsletter signup — honeypot, validation,
 * rate limit, captcha — and subscribes the reader in the same step. A follow
 * with no subscription behind it would never send anything, so this always
 * does both.
 *
 * Service role, for the same reason as /api/newsletter/subscribe: an
 * anonymous visitor has to write a row they must never be able to read.
 */

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let payload: { email?: string; company?: string; captchaToken?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  // Honeypot — answer as though it worked.
  if ((payload.company ?? "").trim()) {
    return NextResponse.json({ ok: true, message: "You're following along." });
  }

  const check = checkEmail(payload.email ?? "");
  if (!check.ok) {
    return NextResponse.json({ ok: false, message: check.message }, { status: 400 });
  }
  const email = check.email;

  if (!hasServiceRole) {
    return NextResponse.json(
      { ok: false, message: "Subscriptions aren't set up yet. Please try again later." },
      { status: 503 }
    );
  }

  const supabase = createAdminSupabase();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const { data: allowed } = await supabase.rpc("check_rate_limit", {
    limit_key: `follow:ip:${ip}`,
    max_hits: 8,
    window_seconds: 600,
  });
  if (allowed === false) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Please try again in a few minutes." },
      { status: 429 }
    );
  }

  const captcha = await verifyCaptcha(payload.captchaToken, ip);
  if (!captcha.ok) {
    return NextResponse.json({ ok: false, message: captcha.message }, { status: 400 });
  }

  const { data: author } = await supabase
    .from("authors")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();

  if (!author) {
    return NextResponse.json({ ok: false, message: "Unknown author." }, { status: 404 });
  }

  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("subscribers")
    .select("id, status, unsubscribe_token")
    .eq("email", email)
    .maybeSingle();

  let subscriberId = existing?.id;
  let unsubscribeToken = existing?.unsubscribe_token;
  const isNewSubscriber = !existing;

  if (existing) {
    // Reactivate anyone previously pending or unsubscribed.
    if (existing.status !== "confirmed") {
      const { error } = await supabase
        .from("subscribers")
        .update({ status: "confirmed", confirmed_at: now, unsubscribed_at: null })
        .eq("id", existing.id);
      if (error) {
        console.error("[follow] reactivate failed:", error.message);
        return NextResponse.json({ ok: false, message: "Could not sign you up." }, { status: 500 });
      }
    }
  } else {
    const { data, error } = await supabase
      .from("subscribers")
      .insert({
        email,
        status: "confirmed",
        confirmed_at: now,
        source: `author:${slug}`,
        consent_ip: ip,
        consent_user_agent: request.headers.get("user-agent") ?? null,
      })
      .select("id, unsubscribe_token")
      .single();

    if (error || !data) {
      console.error("[follow] insert failed:", error?.message);
      return NextResponse.json({ ok: false, message: "Could not sign you up." }, { status: 500 });
    }
    subscriberId = data.id;
    unsubscribeToken = data.unsubscribe_token;
  }

  // Idempotent: following twice is not an error.
  const { error: linkError } = await supabase
    .from("subscriber_authors")
    .upsert(
      { subscriber_id: subscriberId!, author_id: author.id },
      { onConflict: "subscriber_id,author_id", ignoreDuplicates: true }
    );

  if (linkError) {
    console.error("[follow] link failed:", linkError.message);
    return NextResponse.json({ ok: false, message: "Could not sign you up." }, { status: 500 });
  }

  // Only welcome someone genuinely new to the list.
  if (isNewSubscriber && unsubscribeToken) {
    const result = await sendWelcomeEmail(email, unsubscribeToken);
    if (!result.ok) console.error("[follow] welcome email failed:", result.message);
  }

  return NextResponse.json({
    ok: true,
    message: `You're following ${author.name}. New work will reach your inbox.`,
  });
}
