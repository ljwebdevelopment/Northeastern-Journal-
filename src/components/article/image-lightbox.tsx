"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Enlarged = { src: string; alt: string; caption: string | null };

/**
 * The largest candidate in an <img>'s srcset, so the enlarged view isn't just
 * the column-width rendition blown up. next/image emits `url 640w, url 1080w`.
 */
function largestSource(img: HTMLImageElement): string {
  const srcset = img.getAttribute("srcset");
  if (!srcset) return img.currentSrc || img.src;
  let best = { url: img.currentSrc || img.src, width: 0 };
  for (const part of srcset.split(",")) {
    const [url, descriptor = ""] = part.trim().split(/\s+/);
    const width = parseFloat(descriptor) || 0;
    if (url && width >= best.width) best = { url, width };
  }
  return best.url;
}

/**
 * Click-to-enlarge for article images. Any <img> inside an element marked
 * `data-zoomable` opens full-screen in a modal <dialog>; it closes on the ✕
 * button, Escape, or a click on the backdrop.
 *
 * One delegated listener rather than a wrapper per image, because the body
 * images arrive as sanitized HTML we don't render as React elements.
 */
export function ImageLightbox() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [image, setImage] = useState<Enlarged | null>(null);

  const close = useCallback(() => dialogRef.current?.close(), []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) return;
      if (!target.closest("[data-zoomable]")) return;
      // A linked image should still follow its link.
      if (target.closest("a")) return;

      event.preventDefault();
      const caption =
        target.closest("figure")?.querySelector("figcaption")?.textContent?.trim() || null;
      setImage({ src: largestSource(target), alt: target.alt, caption });
      dialogRef.current?.showModal();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Keep the page behind from scrolling while the image is open.
  useEffect(() => {
    if (!image) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [image]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={image?.alt ? `Enlarged image: ${image.alt}` : "Enlarged image"}
      onClose={() => setImage(null)}
      // Clicks on the dark surround close it; clicks on the picture don't.
      onClick={(event) => {
        if (event.target === event.currentTarget || (event.target as HTMLElement).dataset.backdrop)
          close();
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/90 p-0 backdrop:bg-transparent"
    >
      {image && (
        <div
          data-backdrop="true"
          className="flex h-full w-full flex-col items-center justify-center gap-3 p-4 sm:p-10"
        >
          <button
            type="button"
            onClick={close}
            autoFocus
            aria-label="Close enlarged image"
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-5 sm:top-5"
          >
            <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- already-optimized URL from the page's own srcset */}
          <img
            src={image.src}
            alt={image.alt}
            className="max-h-[85dvh] max-w-full rounded-lg object-contain shadow-2xl"
          />
          {image.caption && (
            <p
              data-backdrop="true"
              className="max-w-3xl text-center text-sm leading-relaxed text-white/80"
            >
              {image.caption}
            </p>
          )}
        </div>
      )}
    </dialog>
  );
}
