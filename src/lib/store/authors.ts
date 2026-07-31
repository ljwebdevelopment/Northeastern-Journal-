/**
 * Author profile persistence.
 *
 * The seed roster in `lib/content/data.ts` stays the source of truth for
 * *who* the authors are; anything an author saves from the dashboard is
 * stored as an override and merged on read. That means a profile edit
 * never requires a code change or a redeploy, and removing an override
 * restores the original seed profile.
 */
import { authors as seedAuthors } from "@/lib/content/data";
import type { Author, AuthorProfileInput } from "@/lib/content/types";
import { getStore } from "./driver";

const OVERRIDES_KEY = "author-profiles";

type OverrideMap = Record<string, Partial<AuthorProfileInput> & { updatedAt?: string }>;

async function readOverrides(): Promise<OverrideMap> {
  return (await getStore().get<OverrideMap>(OVERRIDES_KEY)) ?? {};
}

function merge(author: Author, override?: OverrideMap[string]): Author {
  if (!override) return author;
  // `undefined` values in an override mean "not set by the editor", so they
  // fall through to the seed value. Empty strings are cleared explicitly by
  // the profile form, which strips them before saving.
  const cleaned = Object.fromEntries(
    Object.entries(override).filter(([, value]) => value !== undefined)
  );
  return { ...author, ...cleaned } as Author;
}

export async function listAuthorProfiles(): Promise<Author[]> {
  const overrides = await readOverrides();
  return seedAuthors.map((author) => merge(author, overrides[author.slug]));
}

/**
 * Resolves by slug first, then by the author's chosen `username`, so a
 * profile is reachable at `/author/<slug>` and `/author/<handle>` alike.
 */
export async function getAuthorProfile(slug: string): Promise<Author | undefined> {
  const overrides = await readOverrides();

  const bySlug = seedAuthors.find((a) => a.slug === slug);
  if (bySlug) return merge(bySlug, overrides[slug]);

  const handle = slug.replace(/^@/, "").toLowerCase();
  const merged = seedAuthors.map((author) => merge(author, overrides[author.slug]));
  return merged.find((a) => a.username?.toLowerCase() === handle);
}

export async function saveAuthorProfile(
  slug: string,
  profile: Partial<AuthorProfileInput>
): Promise<Author> {
  if (!seedAuthors.some((a) => a.slug === slug)) {
    throw new Error(`Unknown author: ${slug}`);
  }
  const overrides = await readOverrides();
  const updatedAt = new Date().toISOString();
  overrides[slug] = { ...overrides[slug], ...profile, updatedAt };
  await getStore().set(OVERRIDES_KEY, overrides);
  const saved = await getAuthorProfile(slug);
  return saved!;
}

/** Drops a saved override so the profile falls back to its seed values. */
export async function resetAuthorProfile(slug: string): Promise<void> {
  const overrides = await readOverrides();
  delete overrides[slug];
  await getStore().set(OVERRIDES_KEY, overrides);
}
