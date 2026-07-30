import type { Metadata } from "next";
import Link from "next/link";
import { getNewsletterIssues } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { NewsletterSignup } from "@/components/shared/newsletter-signup";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Newsletter",
  description: "Subscribe to the Sunday Letter, the Northeastern Journal's weekly newsletter, and browse the issue archive.",
  alternates: { canonical: `${siteConfig.url}/newsletter` },
};

export default async function NewsletterPage() {
  const issues = await getNewsletterIssues();

  return (
    <div className="content-container py-10">
      <Breadcrumbs items={[{ name: "Newsletter", href: "/newsletter" }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Newsletter", url: `${siteConfig.url}/newsletter` },
            ])
          ),
        }}
      />

      <header className="mx-auto max-w-2xl text-center">
        <p className="kicker">The Sunday Letter</p>
        <h1 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">Newsletter</h1>
        <p className="mt-3 text-base text-muted">
          One weekly email from the Northeastern Journal newsroom, delivered
          Sunday mornings.
        </p>
      </header>

      <div className="mx-auto mt-10 max-w-xl">
        <NewsletterSignup />
      </div>

      <section className="mt-16 border-t border-border pt-10">
        <div className="flex items-end justify-between">
          <h2 className="font-serif text-2xl font-bold">Featured Issues</h2>
          <Link href="/newsletter/archive" className="text-sm font-semibold text-accent hover:underline">
            Full Archive
          </Link>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {issues.slice(0, 4).map((issue) => (
            <Link
              key={issue.slug}
              href={`/newsletter/${issue.slug}`}
              className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent"
            >
              <p className="kicker">Issue No. {issue.issueNumber}</p>
              <h3 className="mt-1 font-serif text-lg font-bold">{issue.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-muted">{issue.summary}</p>
              <time dateTime={issue.publishedAt} className="mt-2 block text-xs text-muted">
                {formatDate(issue.publishedAt)}
              </time>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
