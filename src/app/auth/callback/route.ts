import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Turns an emailed auth link into a session cookie. Day-to-day sign in is
 * email + password and does not pass through here — this is for password
 * recovery and invite links.
 *
 * Supabase sends one of two shapes depending on the project's email
 * template, and a link that arrives in the other shape has to work too —
 * otherwise the reader is bounced to /login with no explanation:
 *
 *   ?code=…                     PKCE. Exchanged for a session. The
 *                               code_verifier cookie is set in the browser
 *                               that requested the link, so this form only
 *                               works in that same browser.
 *   ?token_hash=…&type=magiclink  Email OTP. Verified server-side with no
 *                               verifier cookie, so it works even when the
 *                               link is opened on another device.
 *
 * Anything that fails is sent to /login with a reason, which the login
 * page renders.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const nextParam = searchParams.get("next");
  // Only ever forward to a path on this site.
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/admin";

  // Supabase reports its own failures (expired link, already used) by
  // redirecting here with an error rather than a code.
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError && !code && !tokenHash) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(providerError)}`
    );
  }

  if (!code && !tokenHash) {
    return NextResponse.redirect(`${origin}/login?error=missing-code`);
  }

  const supabase = await createServerSupabase();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=not-configured`);
  }

  const { error } = tokenHash
    ? await supabase.auth.verifyOtp({
        type: type ?? "magiclink",
        token_hash: tokenHash,
      })
    : await supabase.auth.exchangeCodeForSession(code!);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
