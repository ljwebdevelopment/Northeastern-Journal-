import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getAuthorBySlug, getConversationBySlug, getConversations } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { formatDate } from "@/lib/utils";

export async function generateStaticParams() {
  const conversations = await getConversations();
  return conversations.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const conversation = await getConversationBySlug(slug);
  if (!conversation) return {};
  return {
    title: conversation.title,
    description: conversation.excerpt,
    alternates: { canonical: `${siteConfig.url}/conversations/${slug}` },
    openGraph: { images: [conversation.image] },
  };
}

const formatLabel: Record<string, string> = {
  "point-counterpoint": "Point / Counterpoint",
  interview: "Interview",
  roundtable: "Roundtable",
  dialogue: "Dialogue",
};

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const conversation = await getConversationBySlug(slug);
  if (!conversation) notFound();

  const speakers = await Promise.all(
    conversation.participants.map((slug) => getAuthorBySlug(slug))
  );
  const speakerName = (slug: string) =>
    speakers.find((s) => s?.slug === slug)?.name ?? slug;

  return (
    <article className="content-container py-10">
      <Breadcrumbs
        items={[
          { name: "Conversations", href: "/conversations" },
          { name: conversation.title, href: `/conversations/${conversation.slug}` },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Conversations", url: `${siteConfig.url}/conversations` },
              { name: conversation.title, url: `${siteConfig.url}/conversations/${conversation.slug}` },
            ])
          ),
        }}
      />

      <header className="mx-auto max-w-2xl text-center">
        <p className="kicker">{formatLabel[conversation.format]}</p>
        <h1 className="mt-3 text-balance font-serif text-3xl font-bold sm:text-4xl">
          {conversation.title}
        </h1>
        <p className="mt-3 text-sm text-muted">
          {speakers.filter(Boolean).map((s) => s!.name).join(" & ")} &middot;{" "}
          <time dateTime={conversation.publishedAt}>{formatDate(conversation.publishedAt)}</time>
        </p>
      </header>

      <div className="relative mx-auto mt-8 aspect-[16/9] max-w-3xl overflow-hidden rounded-2xl bg-surface-muted">
        <Image src={conversation.image} alt={conversation.title} fill sizes="768px" className="object-cover" />
      </div>

      <div className="mx-auto mt-10 max-w-2xl space-y-6">
        {conversation.body.map((turn, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5">
            <p className="kicker">{speakerName(turn.speaker)}</p>
            <p className="mt-2 text-base leading-relaxed text-foreground/90">{turn.text}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
