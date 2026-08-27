"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { Minus, Plus, Printer, Type } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = ["sm", "md", "lg", "xl"] as const;
type Size = (typeof SIZES)[number];

const STORAGE_KEY = "nj:text-size";
const CHANGED = "nj:text-size-changed";

/*
 * The stored preference is the source of truth, and localStorage is an
 * external store, so it is read through `useSyncExternalStore` rather than
 * copied into state by an effect. Three things fall out of that:
 *
 *   - the server renders the default and the client corrects it on hydration,
 *     with no flash of a second render
 *   - a change in one tab reaches the others, via the browser's own `storage`
 *     event — someone who bumps the type size shouldn't have to do it again
 *     in every tab they have open
 *   - the same tab hears about its own writes through a custom event, since
 *     `storage` deliberately doesn't fire on the tab that caused it
 */

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
};

/*
 * Every touch of localStorage is guarded.
 *
 * Reading it is not merely allowed to come back empty — the accessor itself
 * throws a SecurityError in a browser configured to block site data (Safari
 * with cross-site tracking prevention, private windows, most in-app browsers).
 * This one runs during render, as `useSyncExternalStore`'s snapshot, so an
 * unguarded read does not degrade the type-size control: it throws through the
 * article's render and the reader is left with an error page in place of the
 * story. A preference nobody can store is a missing preference, not a missing
 * article.
 *
 * `sessionSize` is the fallback that keeps the control working anyway: where
 * the preference cannot be persisted it still applies for as long as the
 * reader is on the page, rather than leaving two buttons that do nothing.
 */
let sessionSize: Size | null = null;

const readSize = (): Size => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Size | null;
    if (stored && SIZES.includes(stored)) return stored;
  } catch {
    // Storage blocked — fall through to whatever this page view has set.
  }
  return sessionSize ?? "md";
};

const writeSize = (size: Size) => {
  sessionSize = size;
  try {
    localStorage.setItem(STORAGE_KEY, size);
  } catch {
    // Storage blocked. The size still applies while the reader is here; it
    // just won't be waiting for them on the next article.
  }
};

/** Text size and print, for the readers who need them. */
export function ReaderControls() {
  const size = useSyncExternalStore(subscribe, readSize, () => "md" as Size);

  // Applied as a data attribute and handled in CSS (globals.css), scoped to
  // the prose — enlarging the body copy must not disturb the masthead.
  useEffect(() => {
    document.documentElement.dataset.textSize = size;
    return () => {
      // Leaving the article restores the site default, so the setting applies
      // to reading rather than to navigation chrome.
      delete document.documentElement.dataset.textSize;
    };
  }, [size]);

  const step = useCallback(
    (direction: 1 | -1) => {
      const next = SIZES[SIZES.indexOf(size) + direction];
      if (!next) return;
      writeSize(next);
      window.dispatchEvent(new Event(CHANGED));
    },
    [size]
  );

  return (
    <div className="flex items-center gap-1 print:hidden">
      <div
        className="flex items-center rounded-full border border-border"
        role="group"
        aria-label="Text size"
      >
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={size === SIZES[0]}
          aria-label="Smaller text"
          className={btnClass}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <Type className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
        <button
          type="button"
          onClick={() => step(1)}
          disabled={size === SIZES[SIZES.length - 1]}
          aria-label="Larger text"
          className={btnClass}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        aria-label="Print this article"
        className="rounded-full border border-border p-2 text-muted transition-colors hover:border-brand hover:text-brand"
      >
        <Printer className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

const btnClass = cn(
  "p-2 text-muted transition-colors hover:text-brand",
  "disabled:cursor-default disabled:opacity-35 disabled:hover:text-muted"
);
