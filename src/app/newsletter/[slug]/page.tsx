import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNewsletterIssueBySlug, getNewsletterIssues } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { NewsletterSignup } from "@/components/shared/newsletter-signup";
import { ARTICLE_PROSE_CLASS } from "@/components/article/prose";
import { cn, formatDate } from "@/lib/utils";

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
      </header>

      {issue.bodyHtml ? (
        <div
          className={cn(ARTICLE_PROSE_CLASS, "mt-10")}
          // Sanitized on write in `sanitizeArticleHtml` — see lib/richtext.ts.
          dangerouslySetInnerHTML={{ __html: issue.bodyHtml }}
        />
      ) : (
        <p className="mx-auto mt-10 max-w-[38rem] text-center text-sm text-muted">
          The full text of this issue went out by email and hasn&apos;t been
          added to the archive.
        </p>
      )}

      <div className="mx-auto mt-14 max-w-xl">
        <NewsletterSignup compact />
      </div>
    </article>
  );
}
