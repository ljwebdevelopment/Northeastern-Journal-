import Image from "next/image";
import Link from "next/link";
import type { Conversation } from "@/lib/content/types";

const formatLabel: Record<Conversation["format"], string> = {
  "point-counterpoint": "Point / Counterpoint",
  interview: "Interview",
  roundtable: "Roundtable",
  dialogue: "Dialogue",
};

export function ConversationCard({ conversation }: { conversation: Conversation }) {
  return (
    <article className="group grid grid-cols-[8rem_1fr] gap-4 sm:grid-cols-[10rem_1fr]">
      <Link
        href={`/conversations/${conversation.slug}`}
        className="relative aspect-square overflow-hidden rounded-lg bg-surface-muted"
      >
        <Image
          src={conversation.image}
          alt={conversation.title}
          fill
          sizes="160px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </Link>
      <div className="flex flex-col justify-center">
        <p className="kicker">{formatLabel[conversation.format]}</p>
        <h3 className="mt-1 font-serif text-lg font-bold leading-snug">
          <Link href={`/conversations/${conversation.slug}`} className="hover:text-accent">
            {conversation.title}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted">
          {conversation.excerpt}
        </p>
      </div>
    </article>
  );
}
