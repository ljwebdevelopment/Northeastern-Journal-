/**
 * Bot screening for public forms. Supports Cloudflare Turnstile and
 * Google reCAPTCHA v3 — whichever has keys configured. With neither
 * configured (local development), verification is skipped so the form
 * still works, and the dashboard surfaces that it is unprotected.
 */

export type CaptchaProvider = "turnstile" | "recaptcha" | "none";

export interface CaptchaVerification {
  ok: boolean;
  provider: CaptchaProvider;
  error?: string;
}

export function captchaProvider(): CaptchaProvider {
  if (process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    return "turnstile";
  }
  if (process.env.RECAPTCHA_SECRET_KEY && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
    return "recaptcha";
  }
  return "none";
}

/** Minimum reCAPTCHA v3 score to accept. Google's default advice is 0.5. */
const RECAPTCHA_MIN_SCORE = Number(process.env.RECAPTCHA_MIN_SCORE ?? "0.5");

export async function verifyCaptcha(
  token: string | undefined | null,
  remoteIp?: string
): Promise<CaptchaVerification> {
  const provider = captchaProvider();
  if (provider === "none") return { ok: true, provider };

  if (!token) {
    return {
      ok: false,
      provider,
      error: "Please complete the verification challenge and try again.",
    };
  }

  const endpoint =
    provider === "turnstile"
      ? "https://challenges.cloudflare.com/turnstile/v0/siteverify"
      : "https://www.google.com/recaptcha/api/siteverify";
  const secretKey =
    provider === "turnstile"
      ? process.env.TURNSTILE_SECRET_KEY!
      : process.env.RECAPTCHA_SECRET_KEY!;

  const body = new URLSearchParams({ secret: secretKey, response: token });
  if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    const result = (await res.json()) as { success?: boolean; score?: number };

    if (!result.success) {
      return {
        ok: false,
        provider,
        error: "Verification failed. Please try again.",
      };
    }
    if (provider === "recaptcha" && typeof result.score === "number") {
      if (result.score < RECAPTCHA_MIN_SCORE) {
        return {
          ok: false,
          provider,
          error: "Verification failed. Please try again.",
        };
      }
    }
    return { ok: true, provider };
  } catch {
    // Never lock legitimate readers out because the captcha service is
    // unreachable; the rate limiter is still in front of this.
    console.warn("[captcha] verification request failed, allowing submission");
    return { ok: true, provider };
  }
}
