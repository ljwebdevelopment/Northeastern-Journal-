import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { Author } from "@/lib/content/types";
import { AuthorSocial } from "./author-social";

/**
 * Contributor card. `variant="detailed"` is used on the contributors
 * index, where there is room for the bio and social row.
 */
export function AuthorCard({
  author,
  articleCount,
  subscriberCount,
  variant = "compact",
}: {
  author: Author;
  articleCount?: number;
  subscriberCount?: number;
  variant?: "compact" | "detailed";
}) {
  if (variant === "detailed") {
    return (
      <article className="group flex flex-col rounded-2xl border border-border bg-surface p-6 transition-shadow hover:card-shadow sm:flex-row sm:gap-6">
        <Link
          href={`/author/${author.slug}`}
          className="relative mx-auto h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-surface-muted sm:mx-0 sm:h-32 sm:w-32"
        >
          <Image
            src={author.photo}
            alt={`Portrait of ${author.name}`}
            fill
            sizes="128px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>

        <div className="mt-5 min-w-0 flex-1 text-center sm:mt-0 sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <p className="kicker">{author.role}</p>
            {author.foundingRole && (
              <span className="rounded-full border border-border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                {author.foundingRole}
              </span>
            )}
          </div>

          <h3 className="mt-1.5 font-serif text-xl font-bold">
            <Link href={`/author/${author.slug}`} className="transition-colors hover:text-brand">
              {author.name}
            </Link>
          </h3>
          {author.username && (
            <p className="mt-0.5 text-xs text-muted">@{author.username}</p>
          )}

          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{author.bio}</p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted sm:justify-start">
            {author.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden /> {author.location}
              </span>
            )}
            {typeof articleCount === "number" && articleCount > 0 && (
              <span>
                {articleCount} {articleCount === 1 ? "article" : "articles"}
              </span>
            )}
            {(author.showSubscriberCount ?? true) &&
              typeof subscriberCount === "number" &&
              subscriberCount > 0 && (
                <span>
                  {subscriberCount.toLocaleString()}{" "}
                  {subscriberCount === 1 ? "subscriber" : "subscribers"}
                </span>
              )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <AuthorSocial author={author} />
            <Link
              href={`/author/${author.slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
            >
              View profile <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <Link
      href={`/author/${author.slug}`}
      className="group flex flex-col items-center rounded-xl border border-border bg-surface p-6 text-center transition-colors hover:border-accent"
    >
      <div className="relative h-20 w-20 overflow-hidden rounded-full bg-surface-muted">
        <Image src={author.photo} alt={author.name} fill sizes="80px" className="object-cover" />
      </div>
      <h3 className="mt-4 font-serif text-lg font-bold group-hover:text-accent">{author.name}</h3>
      <p className="mt-1 text-xs uppercase tracking-wide text-muted">{author.role}</p>
      {author.foundingRole && (
        <span className="mt-2 rounded-full border border-border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
          {author.foundingRole}
        </span>
      )}
    </Link>
  );
}
