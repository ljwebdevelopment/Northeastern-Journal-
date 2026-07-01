import Image from "next/image";
import Link from "next/link";
import type { Author } from "@/lib/content/types";

export function AuthorCard({ author }: { author: Author }) {
  return (
    <Link
      href={`/author/${author.slug}`}
      className="group flex flex-col items-center rounded-xl border border-border bg-surface p-6 text-center transition-colors hover:border-accent"
    >
      <div className="relative h-20 w-20 overflow-hidden rounded-full bg-surface-muted">
        <Image
          src={author.photo}
          alt={author.name}
          fill
          sizes="80px"
          className="object-cover"
        />
      </div>
      <h3 className="mt-4 font-serif text-lg font-bold group-hover:text-accent">
        {author.name}
      </h3>
      <p className="mt-1 text-xs uppercase tracking-wide text-muted">
        {author.role}
      </p>
    </Link>
  );
}
