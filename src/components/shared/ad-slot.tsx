"use client";

import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT } from "@/lib/ads";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdSlotProps = {
  /** AdSense ad unit ID (`data-ad-slot`). Unset → nothing renders. */
  slot?: string;
  /**
   * `rail` is a fixed 160×600 skyscraper for the desktop side columns;
   * `responsive` fills its container width and lets AdSense pick the size;
   * `in-article` is AdSense's native "In-article" unit, styled to sit
   * between paragraphs.
   */
  variant?: "rail" | "responsive" | "in-article";
  className?: string;
};

/**
 * One labelled AdSense unit. Space is reserved up front so the page doesn't
 * jump when the ad loads, and the "Advertisement" label keeps it clearly
 * separate from the journalism around it.
 */
export function AdSlot({ slot, variant = "responsive", className }: AdSlotProps) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!slot || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blockers and AdSense's own "already filled" errors land here.
      // An empty ad box is never worth breaking the page over.
    }
  }, [slot]);

  if (!slot) {
    if (process.env.NODE_ENV !== "development") return null;
    // Local preview of where a placement sits before its unit exists.
    return (
      <div
        data-print-hide
        className={cn(
          "flex items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted",
          variant === "rail" ? "h-[600px] w-[160px]" : "min-h-[250px] w-full",
          className
        )}
      >
        Ad slot
      </div>
    );
  }

  return (
    // `data-ad` keeps "Listen to this article" from treating the label as a
    // paragraph; `not-prose` keeps article typography off it.
    <aside data-print-hide data-ad aria-label="Advertisement" className={cn("not-prose text-center", className)}>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
        Advertisement
      </p>
      {variant === "rail" ? (
        <ins
          className="adsbygoogle"
          style={{ display: "inline-block", width: 160, height: 600 }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
        />
      ) : variant === "in-article" ? (
        <ins
          className="adsbygoogle block w-full"
          style={{ display: "block", textAlign: "center" }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
          data-ad-layout="in-article"
          data-ad-format="fluid"
        />
      ) : (
        <ins
          className="adsbygoogle block min-h-[250px] w-full"
          style={{ display: "block" }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      )}
    </aside>
  );
}
