import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { NewsletterSignup } from "@/components/shared/newsletter-signup";

export const metadata: Metadata = {
  title: "About",
  description:
    "Northeastern Journal is an independent newsroom covering northeastern Oklahoma — local reporting, civic accountability, culture, and community voices.",
  alternates: { canonical: `${siteConfig.url}/about` },
};

const values = [
  {
    title: "Independent",
    body: "No chain owner, no outside newsroom setting our priorities. Editorial decisions are made here, by the people who live here.",
  },
  {
    title: "Local First",
    body: "School boards and city councils get the same rigor as national politics, because those are the rooms where daily life is actually decided.",
  },
  {
    title: "Open to the Community",
    body: "Letters, roundtables, and reader essays sit alongside staff reporting, not beneath it. Our Conversations section publishes disagreement in the open.",
  },
  {
    title: "Built to Grow",
    body: "The Journal is structured for a widening masthead. New reporters, columnists, and contributors can join and publish without rebuilding anything.",
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
        <h1 className="mt-3 text-balance font-serif text-4xl font-bold sm:text-5xl">
          Independent News for Northeastern Oklahoma
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
          Northeastern Journal is an independent newsroom covering the
          communities of northeastern Oklahoma — civic accountability, local
          culture, and the voices of the people who live here.
        </p>
      </header>

      <section className="mx-auto mt-14 max-w-3xl space-y-5 text-base leading-relaxed text-foreground/90">
        <p>
          The Journal was founded by{" "}
          <strong className="font-semibold">Cheryl Leeds</strong> and{" "}
          <strong className="font-semibold">Luke Johnson</strong>, who still
          run it day to day — Cheryl as editor, Luke as publisher. They started
          it for a simple reason: the region deserved reporting that answered
          to its readers and to nobody else.
        </p>
        <p>
          Today the Journal publishes staff reporting, columns, interviews, and
          community submissions. Our masthead is open. If you report, write, or
          photograph in northeastern Oklahoma, we want to hear from you —
          contributors are added to the newsroom with their own byline, profile,
          and archive.
        </p>
        <p>
          We believe local journalism works best when it treats readers as
          neighbors rather than an audience. That means covering school boards
          and city councils with the same rigor as national politics,
          publishing disagreement in the open through our Conversations
          section, and giving newer writers a real platform through our Next
          Generation program.
        </p>
      </section>

      <section className="mx-auto mt-14 max-w-3xl rounded-2xl border border-border bg-surface p-8">
        <h2 className="font-serif text-2xl font-bold">Who Runs the Journal</h2>
        <dl className="mt-6 grid gap-6 sm:grid-cols-2">
          {siteConfig.founders.map((person) => (
            <div key={person.name}>
              <dt className="font-serif text-lg font-bold">{person.name}</dt>
              <dd className="mt-1 text-sm text-muted">{person.role}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-sm leading-relaxed text-muted">
          Interested in writing for us?{" "}
          <Link href="/contribute" className="font-semibold text-accent hover:underline">
            See how to pitch the Journal
          </Link>
          .
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
