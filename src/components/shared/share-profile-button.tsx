"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

/**
 * One-tap share for an author profile. Opens the OS share sheet where there
 * is one (most phones) and copies the link everywhere else. The preview the
 * recipient sees — portrait, name, bio — comes from the page's Open Graph
 * tags, so only the URL needs to travel.
 */
export function ShareProfileButton({
  url,
  name,
  inverted = false,
}: {
  url: string;
  name: string;
  inverted?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const title = `${name} — ${siteConfig.name}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text: `Read ${name} on ${siteConfig.name}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Share sheet dismissed or clipboard denied — nothing to do.
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={share}
        className={
          inverted
            ? "inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/25"
            : "inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs font-semibold text-foreground/80 transition-colors hover:border-brand hover:text-brand"
        }
      >
        {copied ? (
          <Check className="h-4 w-4" aria-hidden />
        ) : (
          <Share2 className="h-4 w-4" aria-hidden />
        )}
        {copied ? "Link copied" : "Share profile"}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Profile link copied to clipboard" : ""}
      </span>
    </>
  );
}
