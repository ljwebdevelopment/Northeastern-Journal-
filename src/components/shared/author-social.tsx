import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";
import { SubstackIcon, TikTokIcon, XIcon } from "@/components/icons/brand-icons";
import type { Author } from "@/lib/content/types";

/** Display order for social icons on a profile. */
const PLATFORMS = [
  ["facebook", "Facebook", Facebook],
  ["instagram", "Instagram", Instagram],
  ["x", "X", XIcon],
  ["tiktok", "TikTok", TikTokIcon],
  ["substack", "Substack", SubstackIcon],
  ["linkedin", "LinkedIn", Linkedin],
  ["youtube", "YouTube", Youtube],
] as const;

export function AuthorSocial({
  author,
  inverted = false,
}: {
  author: Author;
  inverted?: boolean;
}) {
  const social = (author.social ?? {}) as Record<string, string | undefined>;
  // `twitter` is the legacy key; treat it as X so older rows still render.
  const resolved: Record<string, string | undefined> = {
    ...social,
    x: social.x || social.twitter,
  };

  const links = PLATFORMS.filter(([key]) => resolved?.[key]);
  if (links.length === 0) return null;

  return (
    <ul className="flex flex-wrap items-center gap-2.5">
      {links.map(([key, label, Icon]) => (
        <li key={key}>
          <a
            href={resolved[key]}
            target="_blank"
            rel="me noopener noreferrer"
            aria-label={`${author.name} on ${label}`}
            className={
              inverted
                ? "inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition-colors hover:bg-white/25"
                : "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground/70 transition-colors hover:border-brand hover:text-brand"
            }
          >
            <Icon className="h-4 w-4" aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  );
}
