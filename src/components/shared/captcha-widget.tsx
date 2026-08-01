"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

/**
 * Renders whichever bot-protection widget is configured — Turnstile,
 * reCAPTCHA v3, or nothing at all in local development. Reports its token
 * through `onToken` so the form posts one field either way.
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
    onNjTurnstile?: (token: string) => void;
  }
}

export function CaptchaWidget({
  onToken,
  action = "newsletter_subscribe",
}: {
  onToken: (token: string) => void;
  action?: string;
}) {
  const [ready, setReady] = useState(false);

  // Turnstile hands its token to a named global callback.
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    window.onNjTurnstile = onToken;
    return () => {
      delete window.onNjTurnstile;
    };
  }, [onToken]);

  // reCAPTCHA v3 is invisible: fetch a token and refresh before it expires.
  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY || TURNSTILE_SITE_KEY || !ready) return;

    let cancelled = false;
    const request = () =>
      window.grecaptcha?.ready(() => {
        window.grecaptcha
          ?.execute(RECAPTCHA_SITE_KEY, { action })
          .then((token) => {
            if (!cancelled) onToken(token);
          })
          .catch(() => undefined);
      });

    request();
    const interval = setInterval(request, 90_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [action, onToken, ready]);

  if (TURNSTILE_SITE_KEY) {
    return (
      <>
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="lazyOnload"
        />
        <div
          className="cf-turnstile flex justify-center"
          data-sitekey={TURNSTILE_SITE_KEY}
          data-callback="onNjTurnstile"
          data-size="flexible"
        />
      </>
    );
  }

  if (RECAPTCHA_SITE_KEY) {
    return (
      <Script
        src={`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`}
        strategy="lazyOnload"
        onLoad={() => setReady(true)}
      />
    );
  }

  return null;
}
