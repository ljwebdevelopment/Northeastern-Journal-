import Image from "next/image";
import Link from "next/link";
import type { Book } from "@/lib/content/types";

export function BookCard({ book, authorName }: { book: Book; authorName?: string }) {
  return (
    <article className="group flex flex-col">
      <Link
        href={`/books/${book.slug}`}
        className="relative block aspect-[2/3] overflow-hidden rounded-lg bg-surface-muted shadow-sm"
      >
        <Image
          src={book.cover}
          alt={`Cover of ${book.title}`}
          fill
          sizes="(min-width: 1024px) 20vw, 45vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </Link>
      <h3 className="mt-3 font-serif text-base font-bold leading-snug">
        <Link href={`/books/${book.slug}`} className="hover:text-accent">
          {book.title}
        </Link>
      </h3>
      {authorName && <p className="mt-0.5 text-sm text-muted">by {authorName}</p>}
    </article>
  );
}
