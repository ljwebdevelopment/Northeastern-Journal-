/**
 * Subscriber records. One key per address so a signup is a single write
 * and never races another subscriber's write.
 */
import type { Subscriber, SubscriberStatus } from "@/lib/newsletter/types";
import { normalizeEmail } from "@/lib/security/email";
import { getStore } from "./driver";

const KEY_PREFIX = "subscriber:";
const key = (email: string) => `${KEY_PREFIX}${normalizeEmail(email)}`;

export async function findSubscriber(email: string): Promise<Subscriber | null> {
  return getStore().get<Subscriber>(key(email));
}

export async function upsertSubscriber(
  email: string,
  patch: Partial<Omit<Subscriber, "email">> = {}
): Promise<Subscriber> {
  const normalized = normalizeEmail(email);
  const now = new Date().toISOString();
  const existing = await findSubscriber(normalized);

  const record: Subscriber = {
    ...existing,
    email: normalized,
    // A resubscribe reactivates the record unless the caller says otherwise.
    status: patch.status ?? "subscribed",
    subscribedAt:
      existing?.status === "subscribed" ? existing.subscribedAt : now,
    ...patch,
    updatedAt: now,
  };
  if (record.status === "subscribed") delete record.unsubscribedAt;

  await getStore().set(key(normalized), record);
  return record;
}

export async function setSubscriberStatus(
  email: string,
  status: SubscriberStatus
): Promise<Subscriber | null> {
  const existing = await findSubscriber(email);
  if (!existing) return null;

  const now = new Date().toISOString();
  const record: Subscriber = {
    ...existing,
    status,
    updatedAt: now,
    ...(status === "unsubscribed"
      ? { unsubscribedAt: now }
      : { unsubscribedAt: undefined, subscribedAt: now }),
  };

  await getStore().set(key(email), record);
  return record;
}

export async function listSubscribers(): Promise<Subscriber[]> {
  const store = getStore();
  const keys = await store.keys(KEY_PREFIX);
  const records = await Promise.all(keys.map((k) => store.get<Subscriber>(k)));
  return records
    .filter((record): record is Subscriber => Boolean(record))
    .sort((a, b) => +new Date(b.subscribedAt) - +new Date(a.subscribedAt));
}

/**
 * Adds an author to a reader's follow list, creating the subscriber
 * record if this is their first signup. Following a journalist also
 * subscribes them, so there's no separate "confirm" step.
 */
export async function followAuthor(
  email: string,
  authorSlug: string,
  patch: Partial<Omit<Subscriber, "email" | "authors">> = {}
): Promise<Subscriber> {
  const existing = await findSubscriber(email);
  const authors = new Set(existing?.authors ?? []);
  authors.add(authorSlug);
  return upsertSubscriber(email, { ...patch, authors: [...authors] });
}

export async function unfollowAuthor(
  email: string,
  authorSlug: string
): Promise<Subscriber | null> {
  const existing = await findSubscriber(email);
  if (!existing) return null;
  const authors = (existing.authors ?? []).filter((slug) => slug !== authorSlug);
  return upsertSubscriber(email, { authors });
}

/** Active followers of one journalist. */
export async function countAuthorSubscribers(authorSlug: string): Promise<number> {
  const all = await listSubscribers();
  return all.filter(
    (s) => s.status === "subscribed" && (s.authors ?? []).includes(authorSlug)
  ).length;
}

/** Follower counts for every author, in one pass over the list. */
export async function authorSubscriberCounts(): Promise<Record<string, number>> {
  const all = await listSubscribers();
  const counts: Record<string, number> = {};
  for (const subscriber of all) {
    if (subscriber.status !== "subscribed") continue;
    for (const slug of subscriber.authors ?? []) {
      counts[slug] = (counts[slug] ?? 0) + 1;
    }
  }
  return counts;
}

export async function isFollowing(email: string, authorSlug: string): Promise<boolean> {
  const subscriber = await findSubscriber(email);
  return Boolean(
    subscriber?.status === "subscribed" && subscriber.authors?.includes(authorSlug)
  );
}

export interface SubscriberStats {
  total: number;
  active: number;
  unsubscribed: number;
  last30Days: number;
}

export async function subscriberStats(): Promise<SubscriberStats> {
  const all = await listSubscribers();
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return {
    total: all.length,
    active: all.filter((s) => s.status === "subscribed").length,
    unsubscribed: all.filter((s) => s.status === "unsubscribed").length,
    last30Days: all.filter((s) => +new Date(s.subscribedAt) >= cutoff).length,
  };
}
