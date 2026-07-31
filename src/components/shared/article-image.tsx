import Image from "next/image";
import type { Article } from "@/lib/content/types";
import { isOptimizable } from "./author-photo";
import { cn } from "@/lib/utils";

/**
 * Article art, or a branded stand-in when a piece has none.
 *
 * Articles are written in the dashboard and an image is optional, so
 * every card has to look deliberate without one rather than showing a
 * broken frame. Author-supplied URLs from hosts outside the next/image
 * allowlist fall back to a plain `<img>`, same as author photos.
 */
export function ArticleImage({
  article,
  sizes,
  className,
  priority = false,
}: {
  article: Pick<Article, "image" | "imageAlt" | "title" | "category">;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const src = article.image?.trim();

  if (!src) {
    return (
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-surface-muted",
          className
        )}
      >
        <span className="font-serif text-2xl font-bold text-brand/25">NJ</span>
      </span>
    );
  }

  if (!isOptimizable(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={article.imageAlt || ""}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={cn("absolute inset-0 h-full w-full object-cover", className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={article.imageAlt || ""}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
    />
  );
}
