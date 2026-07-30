import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/env";
import { sendConfirmationEmail } from "@/lib/email/send";

/**
 * Newsletter signup — step one of double opt-in.
 *
 * Creates (or revives) a `pending` subscriber and emails them a confirmation
 * link. Nothing is ever sent to an address that hasn't clicked that link.
 *
 * Runs with the service-role key because an anonymous visitor must be able to
 * write a row they can't read — RLS gives `anon` no access to `subscribers` at
 * all, which is what keeps the list private.
 */

export const runtime = "nodejs";

// Small in-process guard against someone hammering the endpoint. Not a
// substitute for a real rate limiter, but it stops casual abuse on a single
// instance without adding infrastructure.
const recent = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(key, hits);
  if (recent.size > 5000) recent.clear();
  return hits.length > MAX_PER_WINDOW;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: NextRequest) {
  let payload: { email?: string; name?: string; source?: string; consent?: boolean };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const email = (payload.email ?? "").trim().toLowerCase();
  const name = (payload.name ?? "").trim() || null;
  const source = (payload.source ?? "website").slice(0, 50);

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, message: "Enter a valid email address." },
      { status: 400 }
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Try again in a minute." },
      { status: 429 }
    );
  }

  if (!hasServiceRole) {
    return NextResponse.json(
      { ok: false, message: "The newsletter isn't set up yet. Please try again later." },
      { status: 503 }
    );
  }

  const supabase = createAdminSupabase();

  const { data: existing } = await supabase
    .from("subscribers")
    .select("id, status, confirm_token")
    .eq("email", email)
    .maybeSingle();

  // Already on the list — say so without revealing anything, and don't resend.
  if (existing?.status === "confirmed") {
    return NextResponse.json({
      ok: true,
      message: "You're already subscribed. Thanks for reading.",
    });
  }

  let confirmToken = existing?.confirm_token;

  if (existing) {
    // Pending or previously unsubscribed: reset to pending and reuse the token.
    const { error } = await supabase
      .from("subscribers")
      .update({
        status: "pending",
        name: name ?? undefined,
        source,
        consent_ip: ip,
        consent_user_agent: request.headers.get("user-agent") ?? null,
        unsubscribed_at: null,
      })
      .eq("id", existing.id);
    if (error) {
      return NextResponse.json({ ok: false, message: "Could not sign you up." }, { status: 500 });
    }
  } else {
    const { data, error } = await supabase
      .from("subscribers")
      .insert({
        email,
        name,
        source,
        status: "pending",
        consent_ip: ip,
        consent_user_agent: request.headers.get("user-agent") ?? null,
      })
      .select("confirm_token")
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, message: "Could not sign you up." }, { status: 500 });
    }
    confirmToken = data.confirm_token;
  }

  const result = await sendConfirmationEmail(email, confirmToken!);

  // The row exists either way; if mail is down, tell the truth without losing
  // the signup.
  if (!result.ok) {
    console.error("[newsletter] confirmation email failed:", result.message);
    return NextResponse.json({
      ok: true,
      message:
        "You're on the list, but we couldn't send the confirmation email just now. We'll follow up.",
    });
  }

  return NextResponse.json({
    ok: true,
    message: "Almost there — check your inbox for a confirmation link.",
  });
}
