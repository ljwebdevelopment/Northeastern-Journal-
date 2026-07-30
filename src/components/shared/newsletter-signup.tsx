"use client";

import { useState } from "react";
import { Loader2, Mail, MailCheck } from "lucide-react";

/**
 * Newsletter signup. Posts to /api/newsletter/subscribe, which stores a
 * `pending` subscriber and emails a confirmation link — nothing is ever sent
 * to an address that hasn't opted in twice.
 */
export function NewsletterSignup({
  compact = false,
  source = "website",
}: {
  compact?: boolean;
  source?: string;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setMessage("");

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = (await response.json()) as { ok: boolean; message: string };

      setMessage(data.message);
      setState(data.ok ? "done" : "error");
      if (data.ok) setEmail("");
    } catch {
      setState("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-brand px-6 py-10 text-brand-foreground sm:px-10">
      <div className="mx-auto max-w-xl text-center">
        {state === "done" ? (
          <MailCheck className="mx-auto h-8 w-8 opacity-90" aria-hidden="true" />
        ) : (
          <Mail className="mx-auto h-8 w-8 opacity-90" aria-hidden="true" />
        )}

        <h2 className="mt-4 font-serif text-2xl font-bold sm:text-3xl">
          The Sunday Letter
        </h2>

        {state === "done" ? (
          <p className="mx-auto mt-3 max-w-md text-sm opacity-95 sm:text-base">{message}</p>
        ) : (
          <>
            <p className="mt-2 text-sm opacity-90 sm:text-base">
              One weekly email from the Northeastern Journal newsroom &mdash;
              local reporting, civic accountability, and the stories behind the
              headlines, delivered Sunday mornings.
            </p>

            <form
              onSubmit={onSubmit}
              className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row"
              aria-label="Newsletter signup"
            >
              <label htmlFor={`newsletter-email-${source}`} className="sr-only">
                Email address
              </label>
              <input
                id={`newsletter-email-${source}`}
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full flex-1 rounded-full border border-white/30 bg-white/10 px-4 py-2.5 text-sm text-brand-foreground placeholder:text-brand-foreground/60 focus:bg-white/20"
              />
              <button
                type="submit"
                disabled={state === "sending"}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {state === "sending" && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                Subscribe
              </button>
            </form>

            {state === "error" && (
              <p role="alert" className="mt-3 text-sm font-medium">
                {message}
              </p>
            )}

            {!compact && (
              <p className="mt-3 text-xs opacity-70">
                We&apos;ll email you once to confirm. Unsubscribe in one click,
                any time. We never sell or share your address &mdash; see our{" "}
                <a href="/privacy" className="underline">
                  privacy notice
                </a>
                .
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
