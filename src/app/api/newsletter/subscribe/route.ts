import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/env";
import { sendWelcomeEmail } from "@/lib/email/send";
import { checkEmail } from "@/lib/security/email-validation";
import { verifyCaptcha } from "@/lib/security/captcha";

/**
 * Newsletter signup — single opt-in.
 *
 * A reader who submits their address is subscribed immediately and gets a
 * welcome email. There is no confirmation link to click.
 *
 * Dropping that click removes the step that used to filter out junk, so the
 * screening moves to submission time, in this order:
 *
 *   1. honeypot field — catches naive bots for free
 *   2. syntax, length, and disposable-domain validation
 *   3. rate limit, per IP and per address, in Postgres so it holds across
 *      serverless instances
 *   4. captcha, when Turnstile or reCAPTCHA keys are configured
 *   5. duplicate detection
 *
 * Runs with the service-role key because an anonymous visitor must be able to
 * write a row they can't read — RLS gives `anon` no access to `subscribers`,
 * which is what keeps the list private.
 */

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let payload: {
    email?: string;
    name?: string;
    source?: string;
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
    return NextResponse.json({ ok: true, message: "You're subscribed. Thanks for reading." });
  }

  const name = (payload.name ?? "").trim() || null;
  const source = (payload.source ?? "website").slice(0, 50);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // 2. Validation first: pure CPU, no database, and a typo shouldn't spend
  // the address's rate-limit budget.
  const check = checkEmail(payload.email ?? "");
  if (!check.ok) {
    return NextResponse.json({ ok: false, message: check.message }, { status: 400 });
  }
  const email = check.email;

  if (!hasServiceRole) {
    return NextResponse.json(
      { ok: false, message: "The newsletter isn't set up yet. Please try again later." },
      { status: 503 }
    );
  }

  const supabase = createAdminSupabase();

  // 3. Rate limit by IP.
  const { data: ipAllowed } = await supabase.rpc("check_rate_limit", {
    limit_key: `subscribe:ip:${ip}`,
    max_hits: 5,
    window_seconds: 600,
  });
  if (ipAllowed === false) {
    return NextResponse.json(
      { ok: false, message: "Too many signup attempts. Please try again in a few minutes." },
      { status: 429 }
    );
  }

  // 4. Captcha (skipped when no provider is configured).
  const captcha = await verifyCaptcha(payload.captchaToken, ip);
  if (!captcha.ok) {
    return NextResponse.json({ ok: false, message: captcha.message }, { status: 400 });
  }

  const { data: emailAllowed } = await supabase.rpc("check_rate_limit", {
    limit_key: `subscribe:email:${email}`,
    max_hits: 3,
    window_seconds: 3600,
  });
  if (emailAllowed === false) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts for this address. Please try again later." },
      { status: 429 }
    );
  }

  // 5. Duplicate detection.
  const { data: existing } = await supabase
    .from("subscribers")
    .select("id, status, unsubscribe_token")
    .eq("email", email)
    .maybeSingle();

  if (existing?.status === "confirmed") {
    return NextResponse.json({
      ok: true,
      message: "You're already subscribed. Thanks for reading.",
    });
  }

  const now = new Date().toISOString();
  const consent = {
    source,
    consent_ip: ip,
    consent_user_agent: request.headers.get("user-agent") ?? null,
  };

  let unsubscribeToken = existing?.unsubscribe_token;

  if (existing) {
    // Previously pending or unsubscribed — subscribe them now.
    const { error } = await supabase
      .from("subscribers")
      .update({
        status: "confirmed",
        confirmed_at: now,
        unsubscribed_at: null,
        ...(name ? { name } : {}),
        ...consent,
      })
      .eq("id", existing.id);

    if (error) {
      console.error("[newsletter] resubscribe failed:", error.message);
      return NextResponse.json({ ok: false, message: "Could not sign you up." }, { status: 500 });
    }
  } else {
    const { data, error } = await supabase
      .from("subscribers")
      .insert({
        email,
        name,
        status: "confirmed",
        confirmed_at: now,
        ...consent,
      })
      .select("unsubscribe_token")
      .single();

    if (error || !data) {
      console.error("[newsletter] insert failed:", error?.message);
      return NextResponse.json({ ok: false, message: "Could not sign you up." }, { status: 500 });
    }
    unsubscribeToken = data.unsubscribe_token;
  }

  // The subscription stands whether or not the welcome email goes out.
  const result = await sendWelcomeEmail(email, unsubscribeToken!);
  if (!result.ok) {
    console.error("[newsletter] welcome email failed:", result.message);
    return NextResponse.json({
      ok: true,
      message: "You're subscribed. (We couldn't send the welcome email just now.)",
    });
  }

  return NextResponse.json({
    ok: true,
    message: "You're subscribed. Check your inbox for a welcome note.",
  });
}
