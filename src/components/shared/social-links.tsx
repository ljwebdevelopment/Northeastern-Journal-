import { socialLinksFor } from "@/lib/authors/social";
import type { Author } from "@/lib/content/types";
import { cn } from "@/lib/utils";

/**
 * Social icon row for an author. `inverted` styles it for the red/photo
 * hero bands; `labelled` adds the platform name beside each icon.
 */
export function SocialLinks({
  author,
  inverted = false,
  labelled = false,
  className,
}: {
  author: Author;
  inverted?: boolean;
  labelled?: boolean;
  className?: string;
}) {
  const links = socialLinksFor(author);
  if (links.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap items-center gap-2.5", className)}>
      {links.map(({ key, label, icon: Icon, href }) => (
        <li key={key}>
          <a
            href={href}
            target="_blank"
            rel="me noopener noreferrer"
            aria-label={`${author.name} on ${label}`}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-full border transition-colors",
              labelled ? "px-4 py-2 text-xs font-semibold" : "h-10 w-10",
              inverted
                ? "border-white/30 bg-white/10 text-white hover:bg-white/25"
                : "border-border text-foreground/70 hover:border-brand hover:text-brand"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {labelled && <span>{label}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}
