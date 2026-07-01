import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHeader({
  title,
  description,
  href,
  hrefLabel = "View all",
}: {
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-9 flex flex-wrap items-end justify-between gap-4 border-b-2 border-border pb-4">
      <div>
        <h2 className="rule-red font-serif text-2xl font-bold text-foreground sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-3 max-w-xl text-sm text-muted">{description}</p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand hover:underline"
        >
          {hrefLabel}
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      )}
    </div>
  );
}
