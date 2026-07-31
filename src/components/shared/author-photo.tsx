import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Hosts configured in `next.config.ts`. Anything else — a photo URL an
 * author pasted from their own site, or an uploaded `data:` image — is
 * rendered with a plain `<img>` so an unconfigured host can never crash
 * the profile page.
 */
const OPTIMIZABLE_HOSTS = ["img.youtube.com"];

export function isOptimizable(src: string): boolean {
  if (!src) return false;
  if (src.startsWith("/")) return true;
  try {
    return OPTIMIZABLE_HOSTS.includes(new URL(src).hostname);
  } catch {
    return false;
  }
}

export const FALLBACK_PHOTO = "/author-placeholder.svg";

export function AuthorPhoto({
  src,
  alt,
  sizes,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const resolved = src?.trim() || FALLBACK_PHOTO;

  if (!isOptimizable(resolved)) {
    return (
      // The host isn't in the next/image allowlist; see the note above.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolved}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={cn("absolute inset-0 h-full w-full object-cover", className)}
      />
    );
  }

  return (
    <Image
      src={resolved}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
    />
  );
}
