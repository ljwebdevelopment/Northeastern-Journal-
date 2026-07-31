import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthors, getConversations } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ConversationCard } from "@/components/shared/conversation-card";

export const metadata: Metadata = {
  title: "Conversations",
  description:
    "Intergenerational discussions: point/counterpoint, interviews, roundtables, and shared essays from the Northeastern Journal family.",
  alternates: { canonical: `${siteConfig.url}/conversations` },
};

export default async function ConversationsPage() {
  const [conversations, authors] = await Promise.all([getConversations(), getAuthors()]);
  // Nothing here yet — the section stays hidden rather than
  // presenting readers an empty page linked from nowhere.
  if (conversations.length === 0) notFound();
  const [featured, ...rest] = conversations;
  const namesFor = (slugs: string[]) =>
    slugs.map((s) => authors.find((a) => a.slug === s)?.name).filter((n): n is string => Boolean(n));

  return (
    <div className="content-container py-10">
      <Breadcrumbs items={[{ name: "Conversations", href: "/conversations" }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            collectionPageJsonLd(
              "Conversations",
              "Intergenerational discussions from the Northeastern Journal family.",
              `${siteConfig.url}/conversations`
            ),
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Conversations", url: `${siteConfig.url}/conversations` },
            ]),
          ]),
        }}
      />

      <header className="mx-auto max-w-2xl text-center">
        <p className="kicker">A Flagship Section</p>
        <h1 className="mt-3 font-serif text-4xl font-bold sm:text-5xl">Conversations</h1>
        <p className="mt-4 text-base text-muted">
          Intergenerational discussion in point/counterpoint, interview,
          roundtable, and dialogue formats &mdash; family members and
          contributors working through civic questions in the open.
        </p>
      </header>

      {featured && (
        <section className="mt-12">
          <ConversationCard conversation={featured} featured participantNames={namesFor(featured.participants)} />
        </section>
      )}

      <section className="mt-10 grid gap-8 sm:grid-cols-2">
        {rest.map((c) => (
          <ConversationCard key={c.slug} conversation={c} participantNames={namesFor(c.participants)} />
        ))}
      </section>
    </div>
  );
}
