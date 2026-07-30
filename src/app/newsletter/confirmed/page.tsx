import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Subscription Confirmed",
  robots: { index: false, follow: true },
};

const MESSAGES: Record<string, { ok: boolean; heading: string; body: string }> = {
  confirmed: {
    ok: true,
    heading: "You're subscribed",
    body: "Thanks for confirming. We've sent a short welcome note, and you'll hear from us when there's reporting worth your time.",
  },
  already: {
    ok: true,
    heading: "Already confirmed",
    body: "This address is already on the list — nothing more to do.",
  },
  invalid: {
    ok: false,
    heading: "That link didn't work",
    body: "The confirmation link may have expired or already been used. Sign up again and we'll send a fresh one.",
  },
  error: {
    ok: false,
    heading: "Something went wrong",
    body: "We couldn't confirm your subscription just now. Please try the link again in a few minutes.",
  },
};

export default async function ConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "invalid" } = await searchParams;
  const message = MESSAGES[status] ?? MESSAGES.invalid;

  return (
    <div className="content-container flex min-h-[60vh] items-center justify-center py-16">
      <div className="max-w-md text-center">
        {message.ok ? (
          <CheckCircle2 className="mx-auto h-12 w-12 text-brand" aria-hidden="true" />
        ) : (
          <XCircle className="mx-auto h-12 w-12 text-muted" aria-hidden="true" />
        )}
        <h1 className="mt-5 font-serif text-3xl font-bold">{message.heading}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{message.body}</p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground"
          >
            Read the Journal
          </Link>
          {!message.ok && (
            <Link
              href="/newsletter"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:border-brand hover:text-brand"
            >
              Sign up again
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
