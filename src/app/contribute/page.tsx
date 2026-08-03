import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";

export const metadata: Metadata = {
  title: "Write for the Journal",
  description:
    "Pitch a story to the Northeastern Journal. We're an independent newsroom and our masthead is open to reporters, columnists, and photographers across northeastern Oklahoma.",
  alternates: { canonical: `${siteConfig.url}/contribute` },
};

const paths = [
  {
    title: "Reporting",
    body: "Local government, schools, courts, business, public safety. If you can cover a meeting and file clean copy, we want to talk.",
  },
  {
    title: "Columns & Opinion",
    body: "Argued perspective grounded in this region. We publish disagreement, including with us — see the Conversations section.",
  },
  {
    title: "Essays & Reflection",
    body: "Personal essay, memoir, reflection, criticism, and poetry. Writing that thinks out loud rather than argues a verdict — and doesn't have to be tied to the week's news.",
  },
  {
    title: "Photography",
    body: "Assignment work and standalone photo essays. Credit and a byline page of your own on every image.",
  },
  {
    title: "Community Voices",
    body: "You don't need a journalism background. Letters and first-person essays from readers run alongside staff reporting.",
  },
];

const faqs = [
  {
    question: "Do I need previous experience?",
    answer:
      "No. Contributors range from working journalists to residents writing about something they know well. Editors work with you on structure and sourcing.",
  },
  {
    question: "How do I pitch?",
    answer:
      "Email a short paragraph on what the story is, why it matters here, and who you'd talk to. A finished draft isn't necessary.",
  },
  {
    question: "What happens after I'm accepted?",
    answer:
      "You get a newsroom account with your own byline, profile page, and archive. You write and edit in the browser; an editor reviews and publishes.",
  },
  {
    question: "Do you pay contributors?",
    answer:
      "Rates depend on the assignment and the Journal's budget in a given month. Ask when you pitch and we'll be straight with you.",
  },
];

export default function ContributePage() {
  return (
    <div className="content-container py-10">
      <Breadcrumbs items={[{ name: "Write for the Journal", href: "/contribute" }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            faqJsonLd(faqs),
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Write for the Journal", url: `${siteConfig.url}/contribute` },
            ]),
          ]),
        }}
      />

      <header className="mx-auto max-w-3xl text-center">
        <p className="kicker">Contribute</p>
        <h1 className="mt-3 text-balance font-serif text-4xl font-bold sm:text-5xl">
          Write for the Journal
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
          Our masthead is open. If you report, write, or photograph in
          northeastern Oklahoma, there&apos;s room for your byline here.
        </p>
      </header>

      <section className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-2">
        {paths.map((p) => (
          <div key={p.title} className="rounded-xl border border-border bg-surface p-6">
            <h2 className="font-serif text-xl font-bold">{p.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto mt-14 max-w-2xl rounded-2xl border border-border bg-brand px-8 py-10 text-center text-brand-foreground">
        <h2 className="font-serif text-2xl font-bold">Send us a pitch</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed opacity-90">
          One paragraph is enough: what the story is, why it matters here, and
          who you&apos;d talk to.
        </p>
        <a
          href="mailto:editor@northeasternjournal.com?subject=Pitch%20for%20the%20Northeastern%20Journal"
          className="mt-6 inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
        >
          editor@northeasternjournal.com
        </a>
      </section>

      <section className="mx-auto mt-16 max-w-2xl">
        <h2 className="font-serif text-2xl font-bold">Questions</h2>
        <dl className="mt-6 space-y-6">
          {faqs.map((f) => (
            <div key={f.question}>
              <dt className="font-semibold">{f.question}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-muted">{f.answer}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-10 text-sm text-muted">
          Already have a newsroom account?{" "}
          <Link href="/login" className="font-semibold text-accent hover:underline">
            Sign in
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
