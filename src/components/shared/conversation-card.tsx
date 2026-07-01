import Image from "next/image";
import Link from "next/link";
import { Users } from "lucide-react";
import type { Conversation } from "@/lib/content/types";

const formatLabel: Record<Conversation["format"], string> = {
  "point-counterpoint": "Point / Counterpoint",
  interview: "Interview",
  roundtable: "Roundtable",
  dialogue: "Dialogue",
};

export function ConversationCard({
  conversation,
  featured = false,
  participantNames,
}: {
  conversation: Conversation;
  featured?: boolean;
  participantNames?: string[];
}) {
  const href = `/conversations/${conversation.slug}`;

  if (featured) {
    return (
      <article className="group relative overflow-hidden rounded-2xl border border-border card-shadow-lg">
        <Link href={href} className="relative block aspect-[16/9] w-full sm:aspect-[21/9]">
          <Image
            src={conversation.image}
            alt={conversation.title}
            fill
            sizes="(min-width: 1024px) 1100px, 100vw"
            priority
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
        </Link>
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-foreground">
            {formatLabel[conversation.format]}
          </span>
          <h2 className="mt-4 max-w-3xl text-balance font-serif text-3xl font-bold leading-[1.05] text-white sm:text-5xl">
            <Link href={href}>{conversation.title}</Link>
          </h2>
          <p className="mt-3 hidden max-w-xl text-base text-white/85 sm:block">
            {conversation.excerpt}
          </p>
          {participantNames && participantNames.length > 0 && (
            <p className="mt-4 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-white/70">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {participantNames.join(" & ")}
            </p>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-surface card-shadow transition-shadow duration-300 hover:shadow-xl">
      <Link href={href} className="relative block aspect-[16/10] w-full">
        <Image
          src={conversation.image}
          alt={conversation.title}
          fill
          sizes="(min-width: 1024px) 45vw, 100vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <span className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
          {formatLabel[conversation.format]}
        </span>
      </Link>
      <div className="p-5 sm:p-6">
        <h3 className="font-serif text-xl font-bold leading-snug">
          <Link href={href} className="transition-colors hover:text-brand">
            {conversation.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-muted">
          {conversation.excerpt}
        </p>
        {participantNames && participantNames.length > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            {participantNames.join(" & ")}
          </p>
        )}
      </div>
    </article>
  );
}
