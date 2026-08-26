import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/**
 * Shown when the content backend is unreachable, in place of a 404 or an
 * empty-archive message.
 *
 * Readers arriving from a shared link need to know the story still exists and
 * is worth coming back for. A bare 404 says the opposite.
 */
export function ServiceNotice({
  variant = "page",
}: {
  /** `page` stands in for a full article/listing; `inline` sits on the home page. */
  variant?: "page" | "inline";
}) {
  const body = (
    <div className="mx-auto max-w-xl text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-balance font-serif text-3xl font-bold leading-tight sm:text-4xl">
        We&apos;re experiencing technical difficulties
      </h1>
      <p className="mt-4 text-base text-muted">
        Our archive is temporarily unavailable while we resolve an issue with
        our hosting provider. Nothing has been lost — every story will be back
        shortly. Thank you for your patience.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Return home
        </Link>
        <Link
          href="/newsletter"
          className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-surface"
        >
          Get notified by email
        </Link>
      </div>
    </div>
  );

  if (variant === "inline") return body;

  return (
    <section className="content-container py-24" role="status" aria-live="polite">
      {body}
    </section>
  );
}
