"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

/**
 * Shows an absolute URL and copies it.
 *
 * The origin is filled in by the browser after mount rather than rendered on
 * the server, so the link is right on localhost, on a preview deployment, and
 * in production without any of them having to agree about a configured site
 * URL. It is written straight to the input through a ref: putting it in state
 * would mean a second render, and re-rendering to change one string in one
 * text box is work for nothing.
 *
 * The field is readable and copyable either way — before the effect runs it
 * shows the path, which is still a usable link.
 */
export function CopyLink({ path }: { path: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (inputRef.current) inputRef.current.value = `${window.location.origin}${path}`;
  }, [path]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    const url = inputRef.current?.value ?? path;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard access can be refused (insecure origin, denied permission).
      // Select the text instead so there is always a manual route.
      inputRef.current?.select();
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={inputRef}
        readOnly
        defaultValue={path}
        onFocus={(e) => e.currentTarget.select()}
        aria-label="Shareable link"
        className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs outline-none focus:border-brand"
      />
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-lg border border-border p-2 text-muted transition-colors hover:border-brand hover:text-brand"
        aria-label={copied ? "Copied" : "Copy link"}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <a
        href={path}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 rounded-lg border border-border p-2 text-muted transition-colors hover:border-brand hover:text-brand"
        aria-label="Open in a new tab"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
