"use client";

import { useCallback, useState } from "react";
import { BellRing, CheckCircle2, Loader2 } from "lucide-react";
import { CaptchaWidget } from "./captcha-widget";

/**
 * Per-journalist subscribe control. Single opt-in, same as the newsletter:
 * submit an address and you're following, with no confirmation click.
 */
export function AuthorSubscribe({
  authorSlug,
  authorName,
  subscriberCount,
  showCount = true,
  inverted = false,
}: {
  authorSlug: string;
  authorName: string;
  subscriberCount: number;
  showCount?: boolean;
  inverted?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const onToken = useCallback((token: string) => setCaptchaToken(token), []);

  const countLabel =
    subscriberCount === 1 ? "1 subscriber" : `${subscriberCount.toLocaleString()} subscribers`;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setMessage("");

    try {
      const response = await fetch(
        `/api/authors/${encodeURIComponent(authorSlug)}/subscribe`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, company, captchaToken }),
        }
      );
      const data = (await response.json()) as { ok: boolean; message: string };
      setMessage(data.message);
      setState(data.ok ? "done" : "error");
    } catch {
      setState("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (state === "done") {
    return (
      <div
        role="status"
        className={
          inverted
            ? "flex items-start gap-2.5 rounded-xl border border-white/30 bg-white/10 px-5 py-4 text-white"
            : "flex items-start gap-2.5 rounded-xl border border-border bg-surface px-5 py-4"
        }
      >
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <p className="text-sm">{message}</p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={
            inverted
              ? "inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-brand transition-opacity hover:opacity-90"
              : "inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
          }
        >
          <BellRing className="h-4 w-4" aria-hidden />
          Subscribe
        </button>
        {showCount && subscriberCount > 0 && (
          <span className={inverted ? "text-sm text-white/80" : "text-sm text-muted"}>
            {countLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-md">
      <p className={inverted ? "text-sm text-white/80" : "text-sm text-muted"}>
        Get {authorName}&rsquo;s new work by email.
      </p>

      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`follow-company-${authorSlug}`}>Company</label>
        <input
          id={`follow-company-${authorSlug}`}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <label htmlFor={`follow-email-${authorSlug}`} className="sr-only">
          Email address
        </label>
        <input
          id={`follow-email-${authorSlug}`}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={
            inverted
              ? "w-full flex-1 rounded-full border border-white/30 bg-white/10 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/60 focus:bg-white/20"
              : "w-full flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-brand"
          }
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className={
            inverted
              ? "inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-brand disabled:opacity-70"
              : "inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-brand-foreground disabled:opacity-70"
          }
        >
          {state === "sending" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Subscribe
        </button>
      </div>

      <div className="mt-3">
        <CaptchaWidget onToken={onToken} action="author_follow" />
      </div>

      {state === "error" && (
        <p
          role="alert"
          className={
            inverted
              ? "mt-3 rounded-lg bg-white/15 px-4 py-2 text-sm text-white"
              : "mt-3 rounded-lg bg-brand/10 px-4 py-2 text-sm text-brand"
          }
        >
          {message}
        </p>
      )}

      <p className={inverted ? "mt-2 text-xs text-white/70" : "mt-2 text-xs text-muted"}>
        No confirmation email needed. Unsubscribe anytime.
      </p>
    </form>
  );
}
