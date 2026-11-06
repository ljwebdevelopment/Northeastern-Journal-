import "server-only";

import type {
  AuthorQuote,
  ProfessionalLink,
  ProfessionalLinkKind,
  ReadingListItem,
  TimelineEntry,
} from "@/lib/content/types";
import type { AuthorRow } from "@/lib/supabase/types";

/**
 * Reads and validates the author profile fields shared by the two editors:
 * Edit Profile (/admin/profile) and the Authors section (/admin/authors).
 *
 * Returns the columns to write plus any field errors. Neither caller writes
 * when `errors` is non-empty. Kept out of the `"use server"` action files,
 * which may only export async functions.
 */

// Browsers submit textarea line breaks as CRLF; store them as the LF the rest
// of the data uses, so re-saving an unchanged profile rewrites nothing.
export const text = (form: FormData, field: string) =>
  String(form.get(field) ?? "").replace(/\r\n?/g, "\n").trim();

/** The platforms author profiles render (see components/shared/author-social.tsx). */
export const SOCIAL_KEYS = [
  "facebook",
  "instagram",
  "x",
  "tiktok",
  "substack",
  "linkedin",
  "youtube",
] as const;

const LINK_KINDS: ProfessionalLinkKind[] = [
  "syndicated",
  "publication",
  "award",
  "press",
  "portfolio",
];

/** Accepts a bare domain so an editor can type "example.com". */
export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Indexes present for a repeatable group, e.g. `quotes[0][text]`. */
function rowIndexes(form: FormData, prefix: string): number[] {
  const found = new Set<number>();
  const pattern = new RegExp(`^${prefix}\\[(\\d+)\\]\\[`);
  for (const key of form.keys()) {
    const match = pattern.exec(key);
    if (match) found.add(Number(match[1]));
  }
  return [...found].sort((a, b) => a - b);
}

export type ProfileFieldValues = Pick<
  AuthorRow,
  | "name"
  | "role"
  | "bio"
  | "long_bio"
  | "photo_url"
  | "username"
  | "location"
  | "email"
  | "website"
  | "featured_quote"
  | "founding_role"
  | "social"
  | "quotes"
  | "reading_list"
  | "timeline"
  | "professional_links"
  | "video_playlist"
  | "speaking"
  | "podcast_url"
  | "show_subscriber_count"
>;

export function parseProfileFields(formData: FormData): {
  values: ProfileFieldValues;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  const name = text(formData, "name").slice(0, 120);
  const role = text(formData, "role").slice(0, 80);
  const bio = text(formData, "bio").slice(0, 320);
  if (!name) errors.name = "Your name is required.";
  if (!role) errors.role = "A job title is required.";
  if (!bio) errors.bio = "A short bio is required — it runs under your byline.";

  const username = text(formData, "username").replace(/^@+/, "").toLowerCase().slice(0, 40);
  if (username && !/^[a-z0-9._-]+$/.test(username)) {
    errors.username = "Use letters, numbers, dots, dashes and underscores only.";
  }

  const website = normalizeUrl(text(formData, "website")).slice(0, 500);
  if (website && !isValidUrl(website)) errors.website = "Enter a full link, e.g. https://example.com";

  const podcastUrl = normalizeUrl(text(formData, "podcastUrl")).slice(0, 500);
  if (podcastUrl && !isValidUrl(podcastUrl)) {
    errors.podcastUrl = "Enter a full link, e.g. https://example.com/podcast";
  }

  const email = text(formData, "email").toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) {
    errors.email = "Enter a valid email address, or leave it blank.";
  }

  const social: Record<string, string> = {};
  for (const key of SOCIAL_KEYS) {
    const value = normalizeUrl(text(formData, `social.${key}`)).slice(0, 500);
    if (!value) continue;
    if (!isValidUrl(value)) {
      errors[`social.${key}`] = `Enter a full ${key} link.`;
      continue;
    }
    social[key] = value;
  }

  const quotes: AuthorQuote[] = [];
  for (const i of rowIndexes(formData, "quotes")) {
    const body = text(formData, `quotes[${i}][text]`).slice(0, 500);
    if (!body) continue;
    quotes.push({
      id: text(formData, `quotes[${i}][id]`) || `q-${Date.now()}-${i}`,
      text: body,
      source: text(formData, `quotes[${i}][source]`).slice(0, 160) || undefined,
    });
  }

  const readingList: ReadingListItem[] = [];
  for (const i of rowIndexes(formData, "reading")) {
    const title = text(formData, `reading[${i}][title]`).slice(0, 200);
    if (!title) continue;
    const url = normalizeUrl(text(formData, `reading[${i}][url]`)).slice(0, 500);
    if (url && !isValidUrl(url)) errors[`reading[${i}][url]`] = "Enter a full link.";
    readingList.push({
      id: text(formData, `reading[${i}][id]`) || `r-${Date.now()}-${i}`,
      title,
      note: text(formData, `reading[${i}][note]`).slice(0, 400) || undefined,
      url: url || undefined,
    });
  }

  const timeline: TimelineEntry[] = [];
  for (const i of rowIndexes(formData, "timeline")) {
    const label = text(formData, `timeline[${i}][label]`).slice(0, 400);
    const year = text(formData, `timeline[${i}][year]`).slice(0, 40);
    if (!label && !year) continue;
    timeline.push({
      id: text(formData, `timeline[${i}][id]`) || `t-${Date.now()}-${i}`,
      year,
      label,
    });
  }

  const professionalLinks: ProfessionalLink[] = [];
  for (const i of rowIndexes(formData, "links")) {
    const title = text(formData, `links[${i}][title]`).slice(0, 200);
    if (!title) continue;
    const kindValue = text(formData, `links[${i}][kind]`) as ProfessionalLinkKind;
    const url = normalizeUrl(text(formData, `links[${i}][url]`)).slice(0, 500);
    if (url && !isValidUrl(url)) errors[`links[${i}][url]`] = "Enter a full link.";
    professionalLinks.push({
      id: text(formData, `links[${i}][id]`) || `l-${Date.now()}-${i}`,
      kind: LINK_KINDS.includes(kindValue) ? kindValue : "publication",
      title,
      outlet: text(formData, `links[${i}][outlet]`).slice(0, 120) || undefined,
      url: url || undefined,
      year: text(formData, `links[${i}][year]`).slice(0, 40) || undefined,
      description: text(formData, `links[${i}][description]`).slice(0, 400) || undefined,
    });
  }

  return {
    errors,
    values: {
      name,
      role,
      bio,
      long_bio: text(formData, "longBio").slice(0, 8000),
      photo_url: text(formData, "photo").slice(0, 2000) || null,
      // Empty strings are stored as null so "not set" is one value, not two.
      username: username || null,
      location: text(formData, "location").slice(0, 120) || null,
      email: email || null,
      website: website || null,
      featured_quote: text(formData, "featuredQuote").slice(0, 400) || null,
      founding_role: text(formData, "foundingRole").slice(0, 60) || null,
      social,
      quotes,
      reading_list: readingList,
      timeline,
      professional_links: professionalLinks,
      video_playlist: text(formData, "videoPlaylist").slice(0, 120) || null,
      speaking: text(formData, "speaking").slice(0, 1200) || null,
      podcast_url: podcastUrl || null,
      show_subscriber_count: formData.get("showSubscriberCount") === "on",
    },
  };
}
