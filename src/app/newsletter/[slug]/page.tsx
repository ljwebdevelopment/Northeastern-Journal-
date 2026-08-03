import type { Metadata } from "next";
import Link from "next/link";
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
        {issue.summary && (
          <p className="mt-6 text-base leading-relaxed text-foreground/90">{issue.summary}</p>
        )}
      </header>

      <div className="mx-auto mt-10 max-w-2xl">
        {/* The editor's note, exactly as it was sent. */}
        {issue.intro
          ?.split(/\n{2,}/)
          .map((p) => p.trim())
          .filter(Boolean)
          .map((paragraph, i) => (
            <p key={i} className="mb-4 text-base leading-relaxed text-foreground/90">
              {paragraph}
            </p>
          ))}

        {issue.lead && (
          <section className="mt-12">
            <SectionHeading>The Lead</SectionHeading>
            {issue.lead.categoryName && <p className="kicker mt-5">{issue.lead.categoryName}</p>}
            <h2 className="mt-2 font-serif text-2xl font-bold leading-tight sm:text-3xl">
              <Link href={issue.lead.url} className="hover:text-brand">
                {issue.lead.title}
              </Link>
            </h2>
            <p className="mt-2 text-sm text-muted">
              {[
                issue.lead.authorName && `By ${issue.lead.authorName}`,
                formatDate(issue.lead.publishedAt),
                issue.lead.readingMinutes && `${issue.lead.readingMinutes} min read`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="mt-4 text-base leading-relaxed text-foreground/90">
              {issue.lead.excerpt}
            </p>
          </section>
        )}

        {issue.latest && issue.latest.length > 0 && (
          <section className="mt-12">
            <SectionHeading>New That Week</SectionHeading>
            <ul className="mt-2 divide-y divide-border">
              {issue.latest.map((item) => (
                <li key={item.slug} className="py-4">
                  <Link href={item.url} className="group">
                    <p className="kicker">
                      {[item.categoryName, formatDate(item.publishedAt)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <h3 className="mt-1 font-serif text-lg font-bold group-hover:text-brand">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{item.excerpt}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {issue.trending && issue.trending.length > 0 && (
          <section className="mt-12">
            <SectionHeading>What Readers Were Reading</SectionHeading>
            <ol className="mt-2 divide-y divide-border">
              {issue.trending.map((item, i) => (
                <li key={item.slug} className="flex gap-4 py-4">
                  <span className="font-serif text-2xl font-bold leading-none text-border">
                    {i + 1}
                  </span>
                  <Link href={item.url} className="group min-w-0">
                    <h3 className="font-serif text-lg font-bold group-hover:text-brand">
                      {item.title}
                    </h3>
                    {item.viewCount ? (
                      <p className="mt-1 text-sm text-muted">
                        {item.viewCount.toLocaleString()} reads
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <div className="mx-auto mt-14 max-w-xl">
        <NewsletterSignup compact />
      </div>
    </article>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-t-2 border-foreground pt-2.5 text-xs font-bold uppercase tracking-[0.14em]">
      {children}
    </h2>
  );
}
