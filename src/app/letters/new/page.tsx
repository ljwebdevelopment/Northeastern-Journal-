import type { Metadata } from "next";
import { getArticleBySlug } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { LetterForm } from "@/components/shared/letter-form";

export const metadata: Metadata = {
  title: "Write to the editor",
  description:
    "Send a letter to the Northeastern Journal newsroom. We read every one and publish a selection.",
  alternates: { canonical: `${siteConfig.url}/letters/new` },
};

export default async function NewLetterPage({
  searchParams,
}: {
  searchParams: Promise<{ article?: string }>;
}) {
  const { article: slug } = await searchParams;
  // A stale or wrong slug just drops the "in response to" line.
  const article = slug ? await getArticleBySlug(slug) : undefined;

  return (
    <div className="content-container py-10">
      <Breadcrumbs
        items={[
          { name: "Letters", href: "/letters" },
          { name: "Write to the editor", href: "/letters/new" },
        ]}
      />

      <header className="mx-auto max-w-2xl text-center">
        <p className="kicker">Letters</p>
        <h1 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">
          Write to the editor
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          Disagree with something we ran? Know something we missed? A newspaper
          is a conversation, and this is where readers hold up their end.
        </p>
      </header>

      <div className="mx-auto mt-10 max-w-2xl">
        <LetterForm articleSlug={article?.slug} articleTitle={article?.title} />
      </div>
    </div>
  );
}
