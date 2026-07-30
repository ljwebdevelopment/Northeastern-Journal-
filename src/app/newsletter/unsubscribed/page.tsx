import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Unsubscribed",
  robots: { index: false, follow: true },
};

export default async function UnsubscribedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const done = status === "done";

  return (
    <div className="content-container flex min-h-[60vh] items-center justify-center py-16">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-3xl font-bold">
          {done ? "You've been unsubscribed" : "We couldn't find that subscription"}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          {done
            ? "You won't receive any more email from the Northeastern Journal. No hard feelings — the reporting stays free to read on the site."
            : "That unsubscribe link may have already been used. If you're still receiving email you'd rather not, reply to any issue and we'll remove you by hand."}
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground"
          >
            Keep reading
          </Link>
          {done && (
            <Link
              href="/newsletter"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:border-brand hover:text-brand"
            >
              Resubscribe
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
