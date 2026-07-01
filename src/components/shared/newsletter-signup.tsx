import { Mail } from "lucide-react";

export function NewsletterSignup({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-brand px-6 py-10 text-brand-foreground sm:px-10">
      <div className="mx-auto max-w-xl text-center">
        <Mail className="mx-auto h-8 w-8 opacity-90" aria-hidden="true" />
        <h2 className="mt-4 font-serif text-2xl font-bold sm:text-3xl">
          The Sunday Letter
        </h2>
        <p className="mt-2 text-sm opacity-90 sm:text-base">
          One weekly email from the Northeastern Journal family &mdash;
          civic news, generational perspectives, and Cherokee Nana&apos;s
          column, delivered Sunday mornings.
        </p>
        <form
          className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row"
          aria-label="Newsletter signup"
        >
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            required
            placeholder="you@example.com"
            className="w-full flex-1 rounded-full border border-white/30 bg-white/10 px-4 py-2.5 text-sm text-brand-foreground placeholder:text-brand-foreground/60 focus:bg-white/20"
          />
          <button
            type="submit"
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          >
            Subscribe
          </button>
        </form>
        {!compact && (
          <p className="mt-3 text-xs opacity-70">
            No spam. Unsubscribe anytime. Read our{" "}
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
