"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Headphones, Pause, Play, RotateCcw, Square } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * "Listen to this article": plays the narrated recording made for each story
 * by the "Article audio" GitHub Action (Kokoro, a free open-source voice
 * model, voice "Bella"). Every reader hears the same natural voice on every
 * device, and the button only appears once a recording exists.
 *
 * Follow-along highlighting: the recording carries the start time of each
 * paragraph ("segments"), indexed in the same order the generator walks the
 * body — every p, h2–h4, li, blockquote and figcaption, innermost only.
 * Change one and the other must change with it.
 */

export type ArticleAudio = {
  audio_url: string;
  duration_seconds: number;
  segments: { block: number; start: number }[];
};

const RATES = [0.75, 1, 1.25, 1.5, 2] as const;
const RATE_KEY = "nj:listen-rate";
const READING = "data-listening";
const BLOCK_SELECTOR = "p, h2, h3, h4, li, blockquote, figcaption";

type Status = "idle" | "playing" | "paused";

function formatTime(s: number) {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function bodyBlocks(bodyId: string): Element[] {
  const body = document.getElementById(bodyId);
  if (!body) return [];
  const nodes = Array.from(body.querySelectorAll(BLOCK_SELECTOR));
  return nodes.filter((n) => !nodes.some((m) => m !== n && n.contains(m)));
}

function clearMark() {
  document.querySelectorAll(`[${READING}]`).forEach((n) => n.removeAttribute(READING));
}

export function ListenButton({
  audio,
  title,
  bodyId = "article-body",
}: {
  audio: ArticleAudio;
  title: string;
  bodyId?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [rate, setRate] = useState<number>(1);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(audio.duration_seconds);

  const el = useRef<HTMLAudioElement | null>(null);
  const blocks = useRef<Element[]>([]);
  const lastBlock = useRef<number | null>(null);

  const highlight = useCallback(
    (t: number) => {
      let block = -1;
      for (const s of audio.segments) {
        if (s.start <= t + 0.05) block = s.block;
        else break;
      }
      if (block === lastBlock.current) return;
      lastBlock.current = block;
      clearMark();
      if (block >= 0) blocks.current[block]?.setAttribute(READING, "");
    },
    [audio.segments]
  );

  const getAudio = useCallback(() => {
    if (el.current) return el.current;
    const a = new Audio(audio.audio_url);
    a.preload = "auto";
    a.addEventListener("timeupdate", () => {
      setTime(a.currentTime);
      highlight(a.currentTime);
    });
    a.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(a.duration)) setDuration(a.duration);
    });
    a.addEventListener("play", () => setStatus("playing"));
    a.addEventListener("pause", () => {
      if (!a.ended) setStatus("paused");
    });
    a.addEventListener("ended", () => {
      setStatus("idle");
      setTime(0);
      a.currentTime = 0;
      lastBlock.current = null;
      clearMark();
    });
    el.current = a;
    return a;
  }, [audio.audio_url, highlight]);

  const play = useCallback(() => {
    const a = getAudio();
    if (status === "idle") {
      blocks.current = bodyBlocks(bodyId);
      try {
        const stored = Number(localStorage.getItem(RATE_KEY));
        if (RATES.includes(stored as (typeof RATES)[number])) setRate(stored);
        a.playbackRate = RATES.includes(stored as (typeof RATES)[number]) ? stored : rate;
      } catch {
        a.playbackRate = rate;
      }
      // Lock-screen and headphone controls on phones.
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title,
          artist: "The Northeastern Journal",
          artwork: [{ src: "/logo-mark.svg", sizes: "512x512", type: "image/svg+xml" }],
        });
        navigator.mediaSession.setActionHandler("play", () => void a.play());
        navigator.mediaSession.setActionHandler("pause", () => a.pause());
        navigator.mediaSession.setActionHandler("seekbackward", () => {
          a.currentTime = Math.max(0, a.currentTime - 15);
        });
        navigator.mediaSession.setActionHandler("seekforward", () => {
          a.currentTime = Math.min(a.duration || Infinity, a.currentTime + 15);
        });
      }
    }
    a.play().catch(() => setStatus("paused"));
    setStatus("playing");
  }, [getAudio, status, bodyId, rate, title]);

  const pause = useCallback(() => el.current?.pause(), []);

  const stop = useCallback(() => {
    const a = el.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    setStatus("idle");
    setTime(0);
    lastBlock.current = null;
    clearMark();
  }, []);

  const back15 = useCallback(() => {
    const a = el.current;
    if (a) a.currentTime = Math.max(0, a.currentTime - 15);
  }, []);

  const cycleRate = useCallback(() => {
    const next = RATES[(RATES.indexOf(rate as (typeof RATES)[number]) + 1) % RATES.length];
    setRate(next);
    if (el.current) el.current.playbackRate = next;
    try {
      localStorage.setItem(RATE_KEY, String(next));
    } catch {
      // Not remembered, but still applies now.
    }
  }, [rate]);

  const seek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const a = el.current;
      if (!a || !duration) return;
      const box = e.currentTarget.getBoundingClientRect();
      a.currentTime = ((e.clientX - box.left) / box.width) * duration;
    },
    [duration]
  );

  // Leaving the article stops the narration and clears the highlight.
  useEffect(() => {
    return () => {
      el.current?.pause();
      el.current = null;
      clearMark();
    };
  }, []);

  const minutes = Math.max(1, Math.round(audio.duration_seconds / 60));

  if (status === "idle") {
    return (
      <button
        type="button"
        onClick={play}
        aria-label={`Listen to this article, ${minutes} minutes`}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-brand hover:text-brand print:hidden"
      >
        <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
        Listen
        <span className="font-normal">· {minutes} min</span>
      </button>
    );
  }

  const pct = duration ? Math.min(100, (time / duration) * 100) : 0;

  return (
    <div
      role="group"
      aria-label="Audio player"
      className="inline-flex flex-col overflow-hidden rounded-full border border-brand text-brand print:hidden"
    >
      <div className="flex items-center gap-0.5 px-1">
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
        <button type="button" onClick={back15} aria-label="Back 15 seconds" className={ctrlClass}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <span className="px-1 text-xs tabular-nums text-muted" aria-live="off">
          {formatTime(time)} / {formatTime(duration)}
        </span>
        <button
          type="button"
          onClick={cycleRate}
          aria-label={`Playback speed ${rate}×, change`}
          className="min-w-[2.5rem] rounded-full px-1.5 py-1.5 text-xs font-semibold tabular-nums hover:bg-brand/10"
        >
          {rate}×
        </button>
        <button type="button" onClick={stop} aria-label="Stop listening" className={ctrlClass}>
          <Square className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
      <div
        role="slider"
        tabIndex={-1}
        aria-label="Position"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(time)}
        onClick={seek}
        className="h-1.5 w-full cursor-pointer bg-brand/10"
      >
        <div className="h-full bg-brand transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const ctrlClass = cn("rounded-full p-2 transition-colors hover:bg-brand/10");
