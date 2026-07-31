"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { BellRing, CheckCircle2, Loader2 } from "lucide-react";
import { followAuthorAction } from "@/lib/newsletter/actions";
import { initialSubscribeState } from "@/lib/newsletter/state";
import { CaptchaWidget } from "./captcha-widget";
import { cn } from "@/lib/utils";

function SubmitButton({ inverted }: { inverted: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-70",
        inverted ? "bg-white text-brand" : "bg-brand text-brand-foreground"
      )}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {pending ? "Subscribing…" : "Subscribe"}
    </button>
  );
}

/**
 * Per-journalist subscribe control. A reader enters their address and is
 * following immediately — same single opt-in rule as the newsletter.
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
  const [state, formAction] = useActionState(followAuthorAction, initialSubscribeState);
  const [open, setOpen] = useState(false);

  const countLabel =
    subscriberCount === 1 ? "1 subscriber" : `${subscriberCount.toLocaleString()} subscribers`;

  if (state.status === "success") {
    return (
      <div
        role="status"
        className={cn(
          "flex items-start gap-2.5 rounded-xl border px-5 py-4",
          inverted ? "border-white/30 bg-white/10 text-white" : "border-border bg-surface"
        )}
      >
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <p className="text-sm">{state.message}</p>
      </div>
    );
  }

  return (
    <div className={cn("w-full", inverted ? "text-white" : "")}>
      {!open ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90",
              inverted ? "bg-white text-brand" : "bg-brand text-brand-foreground"
            )}
          >
            <BellRing className="h-4 w-4" aria-hidden />
            Subscribe
          </button>
          {showCount && subscriberCount > 0 && (
            <span className={cn("text-sm", inverted ? "text-white/80" : "text-muted")}>
              {countLabel}
            </span>
          )}
        </div>
      ) : (
        <form action={formAction} className="w-full max-w-md">
          <input type="hidden" name="authorSlug" value={authorSlug} />
          <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
            <label htmlFor={`follow-company-${authorSlug}`}>Company</label>
            <input
              id={`follow-company-${authorSlug}`}
              name="company"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <p className={cn("text-sm", inverted ? "text-white/80" : "text-muted")}>
            Get {authorName}&rsquo;s new work by email.
          </p>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <label htmlFor={`follow-email-${authorSlug}`} className="sr-only">
              Email address
            </label>
            <input
              id={`follow-email-${authorSlug}`}
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className={cn(
                "w-full flex-1 rounded-full border px-4 py-2.5 text-sm outline-none",
                inverted
                  ? "border-white/30 bg-white/10 text-white placeholder:text-white/60 focus:bg-white/20"
                  : "border-border bg-background focus:border-brand"
              )}
            />
            <SubmitButton inverted={inverted} />
          </div>

          <div className="mt-3">
            <CaptchaWidget action="author_follow" />
          </div>

          {state.status === "error" && (
            <p
              role="alert"
              className={cn(
                "mt-3 rounded-lg px-4 py-2 text-sm",
                inverted ? "bg-white/15 text-white" : "bg-brand/10 text-brand"
              )}
            >
              {state.message}
            </p>
          )}

          <p className={cn("mt-2 text-xs", inverted ? "text-white/70" : "text-muted")}>
            No confirmation email needed. Unsubscribe anytime.
          </p>
        </form>
      )}
    </div>
  );
}
