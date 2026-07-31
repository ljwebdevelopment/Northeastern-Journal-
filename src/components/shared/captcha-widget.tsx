"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

/**
 * Renders whichever bot-protection widget is configured:
 *
 * - Cloudflare Turnstile when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set
 * - reCAPTCHA v3 when `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is set
 * - nothing at all when neither is (local development)
 *
 * Both write their token into a hidden input the form posts, so the
 * server action reads one field regardless of provider.
 */

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

export const captchaEnabled = Boolean(TURNSTILE_SITE_KEY || RECAPTCHA_SITE_KEY);

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export function CaptchaWidget({
  action = "newsletter_subscribe",
  theme = "auto",
}: {
  action?: string;
  theme?: "auto" | "light" | "dark";
}) {
  const [token, setToken] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // reCAPTCHA v3 is invisible: request a token on mount and refresh it
  // before it expires (Google's tokens last two minutes).
  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY || TURNSTILE_SITE_KEY) return;

    let cancelled = false;
    const requestToken = () => {
      window.grecaptcha?.ready(() => {
        window.grecaptcha
          ?.execute(RECAPTCHA_SITE_KEY, { action })
          .then((value) => {
            if (!cancelled) setToken(value);
          })
          .catch(() => undefined);
      });
    };

    requestToken();
    const interval = setInterval(requestToken, 90_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [action]);

  if (TURNSTILE_SITE_KEY) {
    return (
      <>
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="lazyOnload"
        />
        <div
          ref={containerRef}
          className="cf-turnstile flex justify-center"
          data-sitekey={TURNSTILE_SITE_KEY}
          data-theme={theme}
          data-size="flexible"
        />
      </>
    );
  }

  if (RECAPTCHA_SITE_KEY) {
    return (
      <>
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`}
          strategy="lazyOnload"
        />
        <input type="hidden" name="g-recaptcha-response" value={token} readOnly />
      </>
    );
  }

  return null;
}
