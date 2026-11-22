"use client";

import { useEffect, useRef } from "react";

/**
 * A 3px line fixed to the top of the window showing how far through the
 * *body* the reader is — not how far down the document, which would count the
 * related rail, comments and footer and reach 60% before the first paragraph
 * ends. 0% while the top of the body is still at or below the top of the
 * viewport; 100% once its last line is on screen.
 *
 * Progress is written straight to the bar's transform rather than through
 * React state, so scrolling never re-renders anything. The server and the
 * first client render both emit `scaleX(0)`, so there is nothing to mismatch
 * on hydration, and being `fixed` it takes no space in the layout.
 *
 * Hidden from assistive technology: it repeats information the scrollbar
 * already carries, and announcing a percentage on every scroll frame would be
 * hostile to a screen-reader user.
 */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = document.getElementById(targetId);
    const bar = barRef.current;
    if (!target || !bar) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = target.getBoundingClientRect();
      const viewport = window.innerHeight;
      const total = rect.height - viewport;
      const progress =
        total <= 0
          ? // Shorter than the viewport: done once its end is on screen.
            rect.bottom <= viewport ? 1 : 0
          : Math.min(1, Math.max(0, -rect.top / total));
      bar.style.transform = `scaleX(${progress})`;
    };

    // Coalesce to one measurement per frame; scroll fires far more often.
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    // Images and embeds in the body load after first paint and change its
    // height without any scroll or resize event.
    const observer = new ResizeObserver(schedule);
    observer.observe(target);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [targetId]);

  return (
    <div
      aria-hidden="true"
      // Above the sticky site header (z-50); never intercepts taps. The
      // neutral track covers the header's own 3px red stripe, which sits in
      // exactly this spot — without it the red fill is invisible against it.
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] bg-border print:hidden"
    >
      <div
        ref={barRef}
        className="h-full origin-left bg-brand transition-transform duration-100 ease-out will-change-transform motion-reduce:transition-none"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
