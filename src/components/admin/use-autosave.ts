"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { autosaveArticle } from "@/app/admin/actions";

export type AutosaveState = "idle" | "saving" | "saved" | "error";

export interface AutosavePayload {
  title: string;
  subtitle: string;
  excerpt: string;
  bodyHtml: string;
  bodyMarkdown: string;
}

export interface AutosaveStatus {
  state: AutosaveState;
  /** True when the draft row itself was updated, not just the history. */
  savedToArticle: boolean;
  at: Date | null;
  message?: string;
  /** Call after a real form save, so the timer doesn't re-send identical text. */
  markSaved: () => void;
}

/**
 * Snapshots the editor every `intervalMs` while there is something new to
 * snapshot.
 *
 * Two deliberate choices:
 *
 *   - It compares against the last text it sent, not against the text the page
 *     loaded with. Typing a word and deleting it again is not a save.
 *   - It never fires for an article without an id. A piece that has never been
 *     saved has no row to attach history to, and inventing one behind the
 *     writer's back would litter the articles list with blank entries.
 *
 * The server decides whether a snapshot also updates the article — see
 * `autosaveArticle`. A published story is only ever snapshotted.
 */
export function useAutosave(
  articleId: string | undefined,
  payload: AutosavePayload,
  { enabled = true, intervalMs = 30_000 }: { enabled?: boolean; intervalMs?: number } = {}
): AutosaveStatus {
  const [state, setState] = useState<AutosaveState>("idle");
  const [savedToArticle, setSavedToArticle] = useState(false);
  const [at, setAt] = useState<Date | null>(null);
  const [message, setMessage] = useState<string>();

  // Live values, read inside the timer without making it a dependency. Kept
  // current in an effect rather than assigned during render: a ref written
  // mid-render is invisible to a re-render React discards.
  const latest = useRef(payload);
  useEffect(() => {
    latest.current = payload;
  });

  const lastSent = useRef<string>(JSON.stringify(payload));
  const inFlight = useRef(false);

  const run = useCallback(async () => {
    if (!articleId || inFlight.current) return;

    const snapshot = JSON.stringify(latest.current);
    if (snapshot === lastSent.current) return;

    inFlight.current = true;
    setState("saving");
    try {
      const result = await autosaveArticle({ id: articleId, ...latest.current });
      if (result.ok) {
        // Mark what we sent, not what is on screen now — anything typed during
        // the round trip should still count as unsaved.
        lastSent.current = snapshot;
        setSavedToArticle(result.savedToArticle);
        setAt(new Date(result.at));
        setState("saved");
        setMessage(undefined);
      } else {
        setState("error");
        setMessage(result.message);
      }
    } catch {
      setState("error");
      setMessage("Couldn't reach the server.");
    } finally {
      inFlight.current = false;
    }
  }, [articleId]);

  useEffect(() => {
    if (!enabled || !articleId) return;
    const timer = setInterval(run, intervalMs);
    return () => clearInterval(timer);
  }, [enabled, articleId, intervalMs, run]);

  /*
   * A last attempt when the tab is hidden or closed. `visibilitychange` is the
   * one the browsers actually honour — `beforeunload` gets no async time on a
   * real close, and Safari has never fired it reliably on mobile.
   */
  useEffect(() => {
    if (!enabled || !articleId) return;
    const onHide = () => {
      if (document.visibilityState === "hidden") void run();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [enabled, articleId, run]);

  /** Keeps the browser's own "leave site?" prompt honest. */
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(latest.current) !== lastSent.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const markSaved = useCallback(() => {
    lastSent.current = JSON.stringify(latest.current);
  }, []);

  return { state, savedToArticle, at, message, markSaved };
}
