"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { subscribeAction } from "@/lib/newsletter/actions";
import { initialSubscribeState } from "@/lib/newsletter/state";
import { CaptchaWidget } from "./captcha-widget";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {pending ? "Subscribing…" : "Subscribe"}
    </button>
  );
}

/**
 * Single opt-in newsletter form: submit an address and you're subscribed
 * on the spot — no confirmation email to click. `source` records which
 * page the signup came from.
 */
export function NewsletterSignup({
  compact = false,
  source,
}: {
  compact?: boolean;
  source?: string;
}) {
  const [state, formAction] = useActionState(subscribeAction, initialSubscribeState);

  return (
    <div className="rounded-2xl border border-border bg-brand px-6 py-10 text-brand-foreground sm:px-10">
      <div className="mx-auto max-w-xl text-center">
        <Mail className="mx-auto h-8 w-8 opacity-90" aria-hidden="true" />
        <h2 className="mt-4 font-serif text-2xl font-bold sm:text-3xl">The Sunday Letter</h2>
        <p className="mt-2 text-sm opacity-90 sm:text-base">
          One weekly email from the Northeastern Journal family &mdash; civic
          news, community reporting, and generational perspectives, delivered
          Sunday mornings.
        </p>

        {state.status === "success" ? (
          <div
            role="status"
            className="mx-auto mt-6 flex max-w-md items-start gap-3 rounded-xl border border-white/30 bg-white/10 px-5 py-4 text-left"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div>
              <p className="text-sm font-semibold">
                {state.alreadySubscribed ? "Already subscribed" : "You're on the list."}
              </p>
              <p className="mt-1 text-sm opacity-90">{state.message}</p>
            </div>
          </div>
        ) : (
          <form action={formAction} className="mt-6" aria-label="Newsletter signup">
            <input type="hidden" name="source" value={source ?? ""} />

            {/* Honeypot: hidden from readers, irresistible to bots. */}
            <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="newsletter-company">Company</label>
              <input
                id="newsletter-company"
                name="company"
                type="text"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={state.status === "error"}
                aria-describedby={state.status === "error" ? "newsletter-error" : undefined}
                className="w-full flex-1 rounded-full border border-white/30 bg-white/10 px-4 py-2.5 text-sm text-brand-foreground placeholder:text-brand-foreground/60 focus:bg-white/20"
              />
              <SubmitButton />
            </div>

            <div className="mt-4 flex justify-center">
              <CaptchaWidget />
            </div>

            {state.status === "error" && (
              <p
                id="newsletter-error"
                role="alert"
                className="mx-auto mt-3 max-w-md rounded-lg bg-white/15 px-4 py-2 text-sm"
              >
                {state.message}
              </p>
            )}
          </form>
        )}

        {!compact && state.status !== "success" && (
          <p className="mt-3 text-xs opacity-70">
            No confirmation email required. Unsubscribe anytime &mdash; every
            issue carries a one-click opt-out. Read our{" "}
            <a href="/about" className="underline">
              editorial values
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
}
