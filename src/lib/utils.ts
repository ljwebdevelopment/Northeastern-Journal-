import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function readingTime(words: number): number {
  return Math.max(1, Math.round(words / 220));
}

/**
 * "4 minutes ago", "3 days ago" — used on comments, where the gap since
 * posting reads better than a date. Falls back to an absolute date past a
 * week, since "37 days ago" is harder to place than "June 24, 2026".
 */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 45) return "just now";

  // Each entry: the unit, its length in seconds, and the point at which the
  // next unit up takes over.
  const scale: [Intl.RelativeTimeFormatUnit, number, number][] = [
    ["minute", 60, 3600],
    ["hour", 3600, 86400],
    ["day", 86400, 604800],
  ];

  const format = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  for (const [unit, size, until] of scale) {
    if (seconds < until) return format.format(-Math.round(seconds / size), unit);
  }

  // Past a week an absolute date is easier to place than a running count.
  return formatDate(iso);
}
