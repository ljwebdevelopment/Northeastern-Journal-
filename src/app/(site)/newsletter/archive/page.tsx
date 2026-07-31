import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getNewsletterIssues } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Newsletter Archive",
  description: "Browse every past issue of the Northeastern Journal's Sunday Letter newsletter.",
  alternates: { canonical: `${siteConfig.url}/newsletter/archive` },
};

export default async function NewsletterArchivePage() {
  const issues = await getNewsletterIssues();
  // Nothing here yet — the section stays hidden rather than
  // presenting readers an empty page linked from nowhere.
  if (issues.length === 0) notFound();

  return (
    <div className="content-container py-10">
      <Breadcrumbs
        items={[
          { name: "Newsletter", href: "/newsletter" },
          { name: "Archive", href: "/newsletter/archive" },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Newsletter", url: `${siteConfig.url}/newsletter` },
              { name: "Archive", url: `${siteConfig.url}/newsletter/archive` },
            ])
          ),
        }}
      />

      <h1 className="font-serif text-4xl font-bold sm:text-5xl">Newsletter Archive</h1>

      <ul className="mt-10 divide-y divide-border">
        {issues.map((issue) => (
          <li key={issue.slug} className="py-5">
            <Link href={`/newsletter/${issue.slug}`} className="group flex items-baseline justify-between gap-4">
              <div>
                <p className="kicker">Issue No. {issue.issueNumber}</p>
                <h2 className="mt-1 font-serif text-xl font-bold group-hover:text-accent">
                  {issue.title}
                </h2>
                <p className="mt-1 text-sm text-muted">{issue.summary}</p>
              </div>
              <time dateTime={issue.publishedAt} className="shrink-0 text-xs text-muted">
                {formatDate(issue.publishedAt)}
              </time>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
