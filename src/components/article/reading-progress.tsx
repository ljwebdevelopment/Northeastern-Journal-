"use client";

import { useEffect, useState } from "react";

/**
 * A hairline at the top of the window showing how far through the *body* the
 * reader is — not how far down the document, which would count the related
 * rail and the newsletter box and reach 60% before the first paragraph ends.
 *
 * Hidden from assistive technology: it repeats information the scrollbar
 * already carries, and announcing a percentage on every scroll frame would be
 * hostile to a screen-reader user.
 */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = target.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      // Shorter than the viewport: there is nothing to track.
      if (total <= 0) return setProgress(rect.bottom <= window.innerHeight ? 1 : 0);
      setProgress(Math.min(1, Math.max(0, -rect.top / total)));
    };

    // Coalesce to one measurement per frame; scroll fires far more often.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [targetId]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 print:hidden"
    >
      <div
        className="h-full bg-brand transition-[width] duration-75 ease-out"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}
