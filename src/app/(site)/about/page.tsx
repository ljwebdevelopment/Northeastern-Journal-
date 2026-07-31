import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { NewsletterSignup } from "@/components/shared/newsletter-signup";

export const metadata: Metadata = {
  title: "About",
  description:
    "Northeastern Journal is a family platform dedicated to civic writing, thoughtful journalism, community discussion, and generational perspectives.",
  alternates: { canonical: `${siteConfig.url}/about` },
};

const values = [
  {
    title: "Civic Writing",
    body: "We publish reporting and commentary meant to strengthen, not exploit, the public conversation. Placeholder copy describing our civic mission for the rebuild.",
  },
  {
    title: "Generational Perspectives",
    body: "Founded by one family and now written by several generations of it, the Journal treats age difference as an editorial asset. Placeholder copy for the rebuild.",
  },
  {
    title: "Community Discussion",
    body: "Letters, roundtables, and reader voices sit alongside staff reporting, not beneath it. Placeholder copy for the rebuild.",
  },
  {
    title: "Thoughtful Journalism",
    body: "We favor context and clarity over speed and spectacle. Placeholder copy describing our editorial standards for the rebuild.",
  },
];

export default function AboutPage() {
  return (
    <div className="content-container py-10">
      <Breadcrumbs items={[{ name: "About", href: "/about" }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "About", url: `${siteConfig.url}/about` },
            ])
          ),
        }}
      />

      <header className="mx-auto max-w-3xl text-center">
        <p className="kicker">About the Journal</p>
        <h1 className="mt-3 font-serif text-4xl font-bold sm:text-5xl">
          A Family Platform for Civic Writing &amp; Generational Perspectives
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
          Northeastern Journal is a family platform dedicated to civic
          writing, thoughtful journalism, community discussion, and
          generational perspectives. This page contains original placeholder
          copy prepared for the publication&apos;s rebuild.
        </p>
      </header>

      <section className="mx-auto mt-14 max-w-3xl space-y-5 text-base leading-relaxed text-foreground/90">
        <p>
          The Journal began as a single family&apos;s effort to keep their
          neighbors informed and their community connected. Today it remains
          family-run, but its pages carry the voices of staff writers,
          contributors, and readers across several generations. This history
          is placeholder text written for the rebuild and does not describe
          any real events.
        </p>
        <p>
          We believe local journalism works best when it treats readers as
          neighbors rather than an audience. That means covering school
          boards and city councils with the same rigor as national politics,
          publishing disagreement in the open through our Conversations
          section, and giving younger writers a real platform through our
          Next Generation program.
        </p>
      </section>

      <section className="mt-16 grid gap-8 sm:grid-cols-2">
        {values.map((v) => (
          <div key={v.title} className="rounded-xl border border-border bg-surface p-6">
            <h2 className="font-serif text-xl font-bold">{v.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{v.body}</p>
          </div>
        ))}
      </section>

      <div className="mt-16">
        <NewsletterSignup />
      </div>
    </div>
  );
}
