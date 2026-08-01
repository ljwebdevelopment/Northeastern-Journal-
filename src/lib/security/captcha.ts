import "server-only";

/**
 * Bot screening for public forms.
 *
 * Supports Cloudflare Turnstile and Google reCAPTCHA v3 — whichever has keys
 * set. With neither configured, verification is skipped so the form still
 * works; the rate limiter is still in front of it.
 */

export type CaptchaProvider = "turnstile" | "recaptcha" | "none";

export function captchaProvider(): CaptchaProvider {
  if (process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    return "turnstile";
  }
  if (process.env.RECAPTCHA_SECRET_KEY && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
    return "recaptcha";
  }
  return "none";
}

const MIN_SCORE = Number(process.env.RECAPTCHA_MIN_SCORE ?? "0.5");

export async function verifyCaptcha(
  token: string | undefined | null,
  remoteIp?: string
): Promise<{ ok: boolean; message?: string }> {
  const provider = captchaProvider();
  if (provider === "none") return { ok: true };

  if (!token) {
    return { ok: false, message: "Please complete the verification and try again." };
  }

  const endpoint =
    provider === "turnstile"
      ? "https://challenges.cloudflare.com/turnstile/v0/siteverify"
      : "https://www.google.com/recaptcha/api/siteverify";
  const secret =
    provider === "turnstile"
      ? process.env.TURNSTILE_SECRET_KEY!
      : process.env.RECAPTCHA_SECRET_KEY!;

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    const result = (await res.json()) as { success?: boolean; score?: number };

    if (!result.success) return { ok: false, message: "Verification failed. Please try again." };
    if (provider === "recaptcha" && typeof result.score === "number" && result.score < MIN_SCORE) {
      return { ok: false, message: "Verification failed. Please try again." };
    }
    return { ok: true };
  } catch {
    // Never lock readers out because the captcha service is unreachable.
    console.warn("[captcha] verification unreachable, allowing submission");
    return { ok: true };
  }
}
