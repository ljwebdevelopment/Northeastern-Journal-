/**
 * Parsing and validation for the dashboard's Edit Profile form. Keeps
 * the server action thin and gives the form field-level error messages.
 */
import type {
  AuthorProfileInput,
  AuthorQuote,
  CategorySlug,
  ProfessionalLink,
  ProfessionalLinkKind,
  ReadingListItem,
  TimelineEntry,
} from "@/lib/content/types";
import { socialPlatforms } from "./social";
import { professionalLinkGroups } from "./stats";

export type FieldErrors = Record<string, string>;

export interface ParseResult {
  ok: boolean;
  values: Partial<AuthorProfileInput>;
  errors: FieldErrors;
}

const LIMITS = {
  name: 120,
  role: 80,
  location: 120,
  bio: 320,
  longBio: 8000,
  featuredQuote: 400,
  url: 500,
  linkTitle: 200,
  linkOutlet: 120,
  linkYear: 40,
  linkDescription: 400,
} as const;

const text = (form: FormData, field: string) =>
  String(form.get(field) ?? "").trim();

/** Accepts a bare domain and upgrades it to https:// so editors can paste
 *  "example.com" without the form rejecting it. */
export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function validUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value);

const isLinkKind = (value: string): value is ProfessionalLinkKind =>
  professionalLinkGroups.some((group) => group.kind === value);

/**
 * Professional links post as indexed fields:
 * `links[0][kind]`, `links[0][title]`, … Rows with no title are dropped,
 * which is how the editor deletes one.
 */
function parseProfessionalLinks(form: FormData, errors: FieldErrors): ProfessionalLink[] {
  const indexes = new Set<number>();
  for (const key of form.keys()) {
    const match = /^links\[(\d+)\]\[/.exec(key);
    if (match) indexes.add(Number(match[1]));
  }

  const links: ProfessionalLink[] = [];
  for (const index of [...indexes].sort((a, b) => a - b)) {
    const field = (name: string) => text(form, `links[${index}][${name}]`);
    const title = field("title").slice(0, LIMITS.linkTitle);
    if (!title) continue;

    const kindValue = field("kind");
    const kind: ProfessionalLinkKind = isLinkKind(kindValue) ? kindValue : "publication";
    const url = normalizeUrl(field("url")).slice(0, LIMITS.url);
    if (url && !validUrl(url)) {
      errors[`links[${index}][url]`] = "Enter a full link, e.g. https://example.com/story";
    }

    links.push({
      id: field("id") || `link-${Date.now()}-${index}`,
      kind,
      title,
      outlet: field("outlet").slice(0, LIMITS.linkOutlet) || undefined,
      url: url || undefined,
      year: field("year").slice(0, LIMITS.linkYear) || undefined,
      description: field("description").slice(0, LIMITS.linkDescription) || undefined,
    });
  }
  return links;
}

/** Collects the row indexes present for a repeatable field group. */
function rowIndexes(form: FormData, prefix: string): number[] {
  const indexes = new Set<number>();
  const pattern = new RegExp(`^${prefix}\\[(\\d+)\\]\\[`);
  for (const key of form.keys()) {
    const match = pattern.exec(key);
    if (match) indexes.add(Number(match[1]));
  }
  return [...indexes].sort((a, b) => a - b);
}

function parseQuotes(form: FormData): AuthorQuote[] {
  const quotes: AuthorQuote[] = [];
  for (const index of rowIndexes(form, "quotes")) {
    const field = (name: string) => text(form, `quotes[${index}][${name}]`);
    const quote = field("text").slice(0, 500);
    if (!quote) continue;
    quotes.push({
      id: field("id") || `quote-${Date.now()}-${index}`,
      text: quote,
      source: field("source").slice(0, 160) || undefined,
    });
  }
  return quotes;
}

function parseReadingList(form: FormData, errors: FieldErrors): ReadingListItem[] {
  const items: ReadingListItem[] = [];
  for (const index of rowIndexes(form, "reading")) {
    const field = (name: string) => text(form, `reading[${index}][${name}]`);
    const title = field("title").slice(0, 200);
    if (!title) continue;
    const url = normalizeUrl(field("url")).slice(0, LIMITS.url);
    if (url && !validUrl(url)) {
      errors[`reading[${index}][url]`] = "Enter a full link, e.g. https://example.com";
    }
    items.push({
      id: field("id") || `reading-${Date.now()}-${index}`,
      title,
      note: field("note").slice(0, 400) || undefined,
      url: url || undefined,
    });
  }
  return items;
}

function parseTimeline(form: FormData): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  for (const index of rowIndexes(form, "timeline")) {
    const field = (name: string) => text(form, `timeline[${index}][${name}]`);
    const label = field("label").slice(0, 400);
    const year = field("year").slice(0, 40);
    if (!label && !year) continue;
    entries.push({
      id: field("id") || `timeline-${Date.now()}-${index}`,
      year,
      label,
    });
  }
  return entries;
}

/** Handles are lowercase letters, numbers, dots, dashes and underscores. */
export function normalizeUsername(value: string): string {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

export function parseProfileForm(
  form: FormData,
  knownCategories: CategorySlug[]
): ParseResult {
  const errors: FieldErrors = {};

  const name = text(form, "name").slice(0, LIMITS.name);
  const role = text(form, "role").slice(0, LIMITS.role);
  const bio = text(form, "bio").slice(0, LIMITS.bio);
  const longBio = text(form, "longBio").slice(0, LIMITS.longBio);

  if (!name) errors.name = "Your name is required.";
  if (!role) errors.role = "A job title is required — Editor, Columnist, Publisher…";
  if (!bio) errors.bio = "A short bio is required. It appears on cards and bylines.";
  if (!longBio) errors.longBio = "Write the full biography shown under “About the Author”.";

  const photo = text(form, "photo").slice(0, 5_000_000);
  if (photo && !photo.startsWith("data:image/") && !photo.startsWith("/")) {
    if (!validUrl(normalizeUrl(photo))) {
      errors.photo = "Enter an image link starting with https:// or upload a file.";
    }
  }

  const website = normalizeUrl(text(form, "website")).slice(0, LIMITS.url);
  if (website && !validUrl(website)) {
    errors.website = "Enter a full link, e.g. https://yourname.com";
  }

  const email = text(form, "email").toLowerCase();
  if (email && !validEmail(email)) {
    errors.email = "Enter a valid email address, or leave this blank.";
  }

  const social: AuthorProfileInput["social"] = {};
  for (const platform of socialPlatforms) {
    const value = normalizeUrl(text(form, `social.${platform.key}`)).slice(0, LIMITS.url);
    if (!value) continue;
    if (!validUrl(value)) {
      errors[`social.${platform.key}`] = `Enter a full ${platform.label} link.`;
      continue;
    }
    social[platform.key] = value;
  }

  const relatedTopics = form
    .getAll("relatedTopics")
    .map(String)
    .filter((slug): slug is CategorySlug => knownCategories.includes(slug as CategorySlug));

  const professionalLinks = parseProfessionalLinks(form, errors);

  const username = normalizeUsername(text(form, "username")).slice(0, 40);
  if (username && !/^[a-z0-9._-]+$/.test(username)) {
    errors.username =
      "Use only letters, numbers, dots, dashes and underscores — no spaces.";
  }

  const podcastUrl = normalizeUrl(text(form, "podcastUrl")).slice(0, LIMITS.url);
  if (podcastUrl && !validUrl(podcastUrl)) {
    errors.podcastUrl = "Enter a full link, e.g. https://example.com/podcast";
  }

  // Optional fields are written as empty strings rather than dropped, so
  // clearing one in the form actually clears it on the public profile
  // instead of falling back to the seeded value.
  const values: Partial<AuthorProfileInput> = {
    name,
    role,
    bio,
    longBio,
    // Blank photo keeps the current one rather than blanking the hero.
    photo: photo || undefined,
    location: text(form, "location").slice(0, LIMITS.location),
    email,
    website,
    featuredQuote: text(form, "featuredQuote").slice(0, LIMITS.featuredQuote),
    social,
    professionalLinks,
    username,
    quotes: parseQuotes(form),
    readingList: parseReadingList(form, errors),
    timeline: parseTimeline(form),
    videoPlaylist: text(form, "videoPlaylist").slice(0, 120),
    speaking: text(form, "speaking").slice(0, 1200),
    podcastUrl,
    showSubscriberCount: form.get("showSubscriberCount") === "on",
    relatedTopics,
  };

  return { ok: Object.keys(errors).length === 0, values, errors };
}
