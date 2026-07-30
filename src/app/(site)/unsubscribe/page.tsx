import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { verifyEmailToken } from "@/lib/security/tokens";
import { UnsubscribeForm } from "./unsubscribe-form";

export const metadata: Metadata = {
  title: "Unsubscribe",
  description: "Stop receiving the Sunday Letter from the Northeastern Journal.",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { email = "", token = "" } = await searchParams;
  const normalized = email.trim().toLowerCase();
  const valid = Boolean(normalized && token && (await verifyEmailToken(normalized, token)));

  return (
    <div className="content-container py-16">
      <div className="mx-auto max-w-lg text-center">
        <p className="kicker">The Sunday Letter</p>
        <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Unsubscribe</h1>

        {valid ? (
          <div className="mt-8">
            <UnsubscribeForm email={normalized} token={token} />
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-border bg-surface p-6 text-left">
            <p className="font-serif text-lg font-bold">This link isn&rsquo;t valid</p>
            <p className="mt-2 text-sm text-muted">
              Unsubscribe links come from the footer of any Sunday Letter. Open
              your most recent issue and use the link there, or email us at{" "}
              <a
                href={`mailto:${siteConfig.publisher.contactEmail}`}
                className="font-semibold text-brand hover:underline"
              >
                {siteConfig.publisher.contactEmail}
              </a>{" "}
              and we&rsquo;ll remove you right away.
            </p>
          </div>
        )}

        <p className="mt-8 text-xs text-muted">
          {siteConfig.publisher.legalName} &middot; {siteConfig.publisher.postalAddress}
        </p>
        <p className="mt-4 text-sm">
          <Link href="/" className="font-semibold text-brand hover:underline">
            Return to the Journal
          </Link>
        </p>
      </div>
    </div>
  );
}
