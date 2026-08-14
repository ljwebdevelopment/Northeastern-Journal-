import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getAuthorBySlug, getConversationBySlug, getConversations } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { socialImage, twitterMetadata } from "@/lib/social-image";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { formatDate, cn } from "@/lib/utils";

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
  const url = `${siteConfig.url}/conversations/${slug}`;
  const image = socialImage(conversation.image, conversation.title);
  return {
    title: conversation.title,
    description: conversation.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      siteName: siteConfig.name,
      title: conversation.title,
      description: conversation.excerpt,
      url,
      images: [image],
    },
    twitter: twitterMetadata({
      title: conversation.title,
      description: conversation.excerpt,
      image,
    }),
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
  const speaker = (slug: string) => speakers.find((s) => s?.slug === slug);
  const isTwoWay = conversation.participants.length === 2;

  return (
    <article>
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

      {/* Magazine-style masthead */}
      <div className="relative overflow-hidden">
        <div className="relative aspect-[16/9] w-full sm:aspect-[21/9]">
          <Image
            src={conversation.image}
            alt={conversation.title}
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
        </div>
        <div className="content-container absolute inset-x-0 bottom-0 pb-8 sm:pb-14">
          <span className="inline-flex items-center rounded-full bg-brand px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-foreground">
            {formatLabel[conversation.format]}
          </span>
          <h1 className="mt-4 max-w-3xl text-balance font-serif text-3xl font-bold leading-[1.05] text-white sm:text-5xl">
            {conversation.title}
          </h1>
          <p className="mt-3 text-sm font-medium text-white/80">
            {speakers.filter(Boolean).map((s) => s!.name).join(" & ")} &middot;{" "}
            <time dateTime={conversation.publishedAt}>{formatDate(conversation.publishedAt)}</time>
          </p>
        </div>
      </div>

      <div className="content-container">
        <div className="pt-6">
          <Breadcrumbs
            items={[
              { name: "Conversations", href: "/conversations" },
              { name: conversation.title, href: `/conversations/${conversation.slug}` },
            ]}
          />
        </div>

        <p className="mx-auto max-w-2xl pb-4 text-center text-lg text-muted">
          {conversation.excerpt}
        </p>

        {/* Turn-by-turn exchange */}
        <div className="mx-auto max-w-3xl space-y-6 py-10">
          {conversation.body.map((turn, i) => {
            const s = speaker(turn.speaker);
            const alignRight = isTwoWay && i % 2 === 1;
            return (
              <div
                key={i}
                className={cn(
                  "flex gap-4",
                  alignRight ? "flex-row-reverse text-right" : "flex-row text-left"
                )}
              >
                {s?.photo && (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-border sm:h-14 sm:w-14">
                    <Image src={s.photo} alt={s.name} fill sizes="56px" className="object-cover" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-xl rounded-2xl border border-border bg-surface p-5 card-shadow sm:p-6",
                    alignRight ? "rounded-tr-sm" : "rounded-tl-sm"
                  )}
                >
                  <p className="kicker">{s?.name ?? turn.speaker}</p>
                  <p className="mt-2 text-balance font-serif text-lg leading-relaxed text-foreground/90 sm:text-xl">
                    {turn.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}
