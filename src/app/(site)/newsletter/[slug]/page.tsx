import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNewsletterIssueBySlug, getNewsletterIssues } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { NewsletterSignup } from "@/components/shared/newsletter-signup";
import { formatDate } from "@/lib/utils";

export async function generateStaticParams() {
  const issues = await getNewsletterIssues();
  return issues.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const issue = await getNewsletterIssueBySlug(slug);
  if (!issue) return {};
  return {
    title: issue.title,
    description: issue.summary,
    alternates: { canonical: `${siteConfig.url}/newsletter/${slug}` },
  };
}

export default async function NewsletterIssuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const issue = await getNewsletterIssueBySlug(slug);
  if (!issue) notFound();

  return (
    <article className="content-container py-10">
      <Breadcrumbs
        items={[
          { name: "Newsletter", href: "/newsletter" },
          { name: issue.title, href: `/newsletter/${slug}` },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Newsletter", url: `${siteConfig.url}/newsletter` },
              { name: issue.title, url: `${siteConfig.url}/newsletter/${slug}` },
            ])
          ),
        }}
      />

      <header className="mx-auto max-w-2xl">
        <p className="kicker">Issue No. {issue.issueNumber}</p>
        <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">{issue.title}</h1>
        <time dateTime={issue.publishedAt} className="mt-2 block text-sm text-muted">
          {formatDate(issue.publishedAt)}
        </time>
        <p className="mt-6 text-base leading-relaxed text-foreground/90">{issue.summary}</p>
        <p className="mt-4 text-base leading-relaxed text-foreground/90">
          This is placeholder newsletter body copy prepared for the
          Northeastern Journal rebuild. In production, this issue would
          contain the full text sent to subscribers, with links back to
          featured articles.
        </p>
      </header>

      <div className="mx-auto mt-14 max-w-xl">
        <NewsletterSignup compact />
      </div>
    </article>
  );
}
