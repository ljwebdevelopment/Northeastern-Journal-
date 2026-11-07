"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Headphones, Pause, Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * "Listen to this article", built on the browser's own text-to-speech
 * (the Web Speech API). It costs nothing, needs no account or extension, and
 * works offline once the page has loaded: every current browser on phones and
 * desktops ships voices of its own. Where a browser has none, the button
 * simply isn't rendered.
 *
 * A few browser quirks shape the implementation:
 *
 *   - Chrome silently stops a single utterance after roughly fifteen seconds,
 *     so the article is read as a queue of short chunks (a sentence or a few),
 *     each spoken when the previous one ends.
 *   - `speechSynthesis.pause()` / `resume()` are unreliable (broken outright
 *     on Android Chrome). Pause here means cancel-and-remember: resuming
 *     restarts the chunk the reader was on, which is at most a sentence back.
 *   - `cancel()` fires `onend` / `onerror` on the utterance it kills in some
 *     browsers, so every run carries a token and stale callbacks are ignored.
 *   - Voices load asynchronously in Chrome (`voiceschanged`), so the voice is
 *     chosen at the moment speaking starts, not at mount.
 */

const RATES = [0.75, 1, 1.25, 1.5, 2] as const;
const RATE_KEY = "nj:listen-rate";
const MAX_CHUNK = 220;
const READING = "data-listening";

type Status = "idle" | "playing" | "paused";
type Chunk = { text: string; el: Element | null };

const subscribeNoop = () => () => {};
const supported = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** Pick the most natural-sounding English voice the browser offers. */
function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const pool = english.length ? english : voices;
  const score = (v: SpeechSynthesisVoice) => {
    let s = 0;
    if (/natural|neural|premium|enhanced/i.test(v.name)) s += 4;
    if (/^Google/i.test(v.name)) s += 3;
    if (/Samantha|Ava|Allison|Aria|Jenny|Guy/i.test(v.name)) s += 2;
    if (v.lang.toLowerCase() === "en-us") s += 1;
    if (v.localService) s += 0.5;
    return s;
  };
  return [...pool].sort((a, b) => score(b) - score(a))[0];
}

/** Split text into sentence-ish pieces short enough for every engine. */
function splitText(text: string): string[] {
  const sentences = text.match(/[^.!?…]+[.!?…]+["'”’)\]]*\s*|[^.!?…]+$/g) ?? [text];
  const out: string[] = [];
  let buf = "";
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if (s.length > MAX_CHUNK) {
      if (buf) {
        out.push(buf);
        buf = "";
      }
      // A run-on with no full stop: break on commas, then on spaces.
      let rest = s;
      while (rest.length > MAX_CHUNK) {
        const clause = Math.max(rest.lastIndexOf(", ", MAX_CHUNK), rest.lastIndexOf("; ", MAX_CHUNK));
        const space = rest.lastIndexOf(" ", MAX_CHUNK);
        const cut = clause > 0 ? clause + 1 : space > 0 ? space : MAX_CHUNK;
        out.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut).trim();
      }
      if (rest) buf = rest;
    } else if ((buf + " " + s).length > MAX_CHUNK) {
      out.push(buf);
      buf = s;
    } else {
      buf = buf ? `${buf} ${s}` : s;
    }
  }
  if (buf) out.push(buf);
  return out;
}

/** Read the headline block and the rendered body straight off the page. */
function collectChunks(title: string, subtitle: string | undefined, bodyId: string): Chunk[] {
  const chunks: Chunk[] = [];
  const push = (text: string, el: Element | null) =>
    splitText(text.replace(/\s+/g, " ").trim()).forEach((t) => chunks.push({ text: t, el }));

  push(title.endsWith(".") ? title : `${title}.`, null);
  if (subtitle) push(subtitle, null);

  const body = document.getElementById(bodyId);
  if (!body) return chunks;
  const nodes = Array.from(body.querySelectorAll("p, h2, h3, h4, li, blockquote, figcaption"));
  // Keep only the innermost readable blocks, so a <li><p> or a <blockquote><p>
  // isn't read twice.
  const leaves = nodes.filter((n) => !nodes.some((m) => m !== n && n.contains(m)));
  for (const el of leaves) {
    const text = (el as HTMLElement).innerText ?? el.textContent ?? "";
    if (text.trim()) push(text, el);
  }
  return chunks;
}

export function ListenButton({
  title,
  subtitle,
  bodyId = "article-body",
  minutes,
}: {
  title: string;
  subtitle?: string;
  bodyId?: string;
  minutes?: number;
}) {
  // Rendered only after hydration, and only where the browser can speak.
  const canSpeak = useSyncExternalStore(subscribeNoop, supported, () => false);

  const [status, setStatus] = useState<Status>("idle");
  const [rate, setRate] = useState<number>(1);
  const [progress, setProgress] = useState(0);

  const chunks = useRef<Chunk[]>([]);
  const index = useRef(0);
  const run = useRef(0);
  const rateRef = useRef(1);
  const voice = useRef<SpeechSynthesisVoice | undefined>(undefined);

  const mark = useCallback((el: Element | null) => {
    document.querySelectorAll(`[${READING}]`).forEach((n) => n.removeAttribute(READING));
    el?.setAttribute(READING, "");
  }, []);

  const speakFrom = useCallback(
    (i: number) => {
      const synth = window.speechSynthesis;
      const token = ++run.current;
      synth.cancel();

      const next = (j: number) => {
        if (token !== run.current) return;
        if (j >= chunks.current.length) {
          index.current = 0;
          setProgress(0);
          setStatus("idle");
          mark(null);
          return;
        }
        index.current = j;
        setProgress(j / chunks.current.length);
        const chunk = chunks.current[j];
        mark(chunk.el);

        const u = new SpeechSynthesisUtterance(chunk.text);
        if (voice.current) {
          u.voice = voice.current;
          u.lang = voice.current.lang;
        } else {
          u.lang = "en-US";
        }
        u.rate = rateRef.current;
        u.onend = () => next(j + 1);
        u.onerror = (e) => {
          // "interrupted"/"canceled" are our own cancel(); anything else, skip
          // the chunk rather than stall the whole article.
          if (e.error === "interrupted" || e.error === "canceled") return;
          next(j + 1);
        };
        synth.speak(u);
      };

      // Some engines (Safari, older Chrome) need a tick after cancel().
      setTimeout(() => next(i), 50);
      setStatus("playing");
    },
    [mark]
  );

  const play = useCallback(() => {
    if (status === "idle" || !chunks.current.length) {
      chunks.current = collectChunks(title, subtitle, bodyId);
      index.current = 0;
      // The reader's last-used speed, if the browser lets us remember it.
      try {
        const stored = Number(localStorage.getItem(RATE_KEY));
        if (RATES.includes(stored as (typeof RATES)[number])) {
          rateRef.current = stored;
          setRate(stored);
        }
      } catch {
        // Storage blocked; default speed it is.
      }
    }
    voice.current = pickVoice();
    speakFrom(index.current);
  }, [status, title, subtitle, bodyId, speakFrom]);

  const pause = useCallback(() => {
    run.current++;
    window.speechSynthesis.cancel();
    setStatus("paused");
  }, []);

  const stop = useCallback(() => {
    run.current++;
    window.speechSynthesis.cancel();
    index.current = 0;
    setProgress(0);
    setStatus("idle");
    mark(null);
  }, [mark]);

  const cycleRate = useCallback(() => {
    const nextRate = RATES[(RATES.indexOf(rateRef.current as (typeof RATES)[number]) + 1) % RATES.length];
    rateRef.current = nextRate;
    setRate(nextRate);
    try {
      localStorage.setItem(RATE_KEY, String(nextRate));
    } catch {
      // Not persisted; still applies for this listen.
    }
    // Rate can't change mid-utterance, so restart the current chunk at the new speed.
    if (status === "playing") speakFrom(index.current);
  }, [status, speakFrom]);

  // Leaving the article (client-side navigation or closing the tab) must not
  // leave the voice reading a page the reader can no longer see.
  useEffect(() => {
    if (!canSpeak) return;
    const halt = () => {
      run.current++;
      window.speechSynthesis.cancel();
    };
    window.addEventListener("pagehide", halt);
    return () => {
      window.removeEventListener("pagehide", halt);
      halt();
      document.querySelectorAll(`[${READING}]`).forEach((n) => n.removeAttribute(READING));
    };
  }, [canSpeak]);

  if (!canSpeak) return null;

  if (status === "idle") {
    return (
      <button
        type="button"
        onClick={play}
        aria-label="Listen to this article"
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-brand hover:text-brand print:hidden"
      >
        <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
        Listen
        {minutes ? <span className="font-normal">· {minutes} min</span> : null}
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Audio player"
      className="relative inline-flex items-center gap-0.5 overflow-hidden rounded-full border border-brand pl-1 pr-1 text-brand print:hidden"
    >
      <button
        type="button"
        onClick={status === "playing" ? pause : play}
        aria-label={status === "playing" ? "Pause" : "Resume"}
        className={ctrlClass}
      >
        {status === "playing" ? (
          <Pause className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        onClick={cycleRate}
        aria-label={`Playback speed ${rate}×, change`}
        className="min-w-[2.75rem] rounded-full px-1.5 py-1.5 text-xs font-semibold tabular-nums hover:bg-brand/10"
      >
        {rate}×
      </button>
      <button type="button" onClick={stop} aria-label="Stop listening" className={ctrlClass}>
        <Square className="h-3 w-3" aria-hidden="true" />
      </button>
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-0.5 bg-brand transition-[width] duration-500"
        style={{ width: `${Math.round(progress * 100)}%` }}
      />
      <span className="sr-only" aria-live="polite">
        {status === "playing" ? "Reading article aloud" : "Paused"}
      </span>
    </div>
  );
}

const ctrlClass = cn("rounded-full p-2 transition-colors hover:bg-brand/10");
