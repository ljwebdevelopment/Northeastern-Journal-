import "server-only";

import { createAdminSupabase } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/env";
import { emailConfig, getResend, isResendConfigured } from "./resend";
import {
  articleAnnouncementEmail,
  confirmSubscriptionEmail,
  welcomeEmail,
  type ArticleAnnouncement,
} from "./templates";

/**
 * All outbound mail. Every function here degrades gracefully: if Resend or the
 * Supabase service role is not configured, they return a descriptive result
 * instead of throwing, so a missing key never takes down publishing.
 */

export interface SendResult {
  ok: boolean;
  sent: number;
  failed: number;
  message: string;
}

const RESEND_BATCH_LIMIT = 100;

/*
 * Both live under /api so a single URL can serve the human click (GET, which
 * redirects to a friendly confirmation page) and the mail client's automated
 * One-Click request (POST). A page route could only answer the GET.
 */
export const confirmUrlFor = (token: string) =>
  `${emailConfig.siteUrl}/api/newsletter/confirm?token=${token}`;

export const unsubscribeUrlFor = (token: string) =>
  `${emailConfig.siteUrl}/api/newsletter/unsubscribe?token=${token}`;

/** Headers that make Gmail/Outlook show a native one-click unsubscribe. */
const listHeaders = (unsubscribeUrl: string) => ({
  "List-Unsubscribe": `<${unsubscribeUrl}>`,
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
});

// ---------------------------------------------------------------------------
// Transactional
// ---------------------------------------------------------------------------

export async function sendConfirmationEmail(
  to: string,
  confirmToken: string
): Promise<SendResult> {
  if (!isResendConfigured) {
    return { ok: false, sent: 0, failed: 1, message: "RESEND_API_KEY is not set." };
  }

  const mail = confirmSubscriptionEmail(confirmUrlFor(confirmToken));
  const { error } = await getResend().emails.send({
    from: emailConfig.from,
    replyTo: emailConfig.replyTo,
    to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });

  if (error) return { ok: false, sent: 0, failed: 1, message: error.message };
  return { ok: true, sent: 1, failed: 0, message: "Confirmation email sent." };
}

export async function sendWelcomeEmail(
  to: string,
  unsubscribeToken: string
): Promise<SendResult> {
  if (!isResendConfigured) {
    return { ok: false, sent: 0, failed: 1, message: "RESEND_API_KEY is not set." };
  }

  const unsubscribeUrl = unsubscribeUrlFor(unsubscribeToken);
  const mail = welcomeEmail(unsubscribeUrl);

  const { error } = await getResend().emails.send({
    from: emailConfig.from,
    replyTo: emailConfig.replyTo,
    to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    headers: listHeaders(unsubscribeUrl),
  });

  if (error) return { ok: false, sent: 0, failed: 1, message: error.message };
  return { ok: true, sent: 1, failed: 0, message: "Welcome email sent." };
}

// ---------------------------------------------------------------------------
// Broadcast
// ---------------------------------------------------------------------------

/**
 * Emails a published article to every confirmed subscriber.
 *
 * Each recipient gets their own message with their own unsubscribe token —
 * no shared "To" line, no exposed addresses. Sent through Resend's batch
 * endpoint, 100 at a time.
 *
 * Idempotency is the caller's job: `articles.notified_at` is checked and
 * stamped in `publishAndNotify` so an article is never announced twice.
 */
export async function sendArticleAnnouncement(
  article: ArticleAnnouncement & {
    articleId?: string;
    sentBy?: string;
    /** Used to respect section follows. Omit and everyone eligible gets it. */
    categorySlug?: string | null;
  }
): Promise<SendResult> {
  if (!isResendConfigured) {
    return { ok: false, sent: 0, failed: 0, message: "RESEND_API_KEY is not set — no email sent." };
  }
  if (!hasServiceRole) {
    return {
      ok: false,
      sent: 0,
      failed: 0,
      message: "SUPABASE_SERVICE_ROLE_KEY is not set — cannot read the subscriber list.",
    };
  }

  const supabase = createAdminSupabase();
  const { data: allSubscribers, error } = await supabase
    .from("subscribers")
    .select("id, email, unsubscribe_token, frequency")
    .eq("status", "confirmed");

  if (error) {
    return { ok: false, sent: 0, failed: 0, message: `Could not load subscribers: ${error.message}` };
  }
  if (!allSubscribers || allSubscribers.length === 0) {
    return { ok: true, sent: 0, failed: 0, message: "No confirmed subscribers yet." };
  }

  /*
   * Honour what readers asked for (migration 0011).
   *
   *   - 'daily' and 'weekly' don't want a message per article. They are not
   *     dropped, they are simply not part of *this* send.
   *   - Section follows are a filter, not a subscription: a reader with no
   *     sections chosen has not opted out of anything, so they get everything.
   *     Treating "no rows" as "nothing" would silently mute the whole list.
   */
  const immediate = allSubscribers.filter((s) => (s.frequency ?? "immediate") === "immediate");

  let subscribers = immediate;
  if (article.categorySlug) {
    const { data: follows } = await supabase
      .from("subscriber_categories")
      .select("subscriber_id, category:categories(slug)")
      .in(
        "subscriber_id",
        immediate.map((s) => s.id)
      );

    const chosen = new Map<string, Set<string>>();
    for (const row of follows ?? []) {
      const slug = (row.category as unknown as { slug: string } | null)?.slug;
      if (!slug) continue;
      const set = chosen.get(row.subscriber_id) ?? new Set<string>();
      set.add(slug);
      chosen.set(row.subscriber_id, set);
    }

    subscribers = immediate.filter((s) => {
      const set = chosen.get(s.id);
      return !set || set.size === 0 || set.has(article.categorySlug!);
    });
  }

  if (subscribers.length === 0) {
    return {
      ok: true,
      sent: 0,
      failed: 0,
      message: "No subscribers are set to receive this one.",
    };
  }

  const resend = getResend();
  let sent = 0;
  let failed = 0;
  let firstError = "";

  for (let i = 0; i < subscribers.length; i += RESEND_BATCH_LIMIT) {
    const chunk = subscribers.slice(i, i + RESEND_BATCH_LIMIT);

    const payload = chunk.map((sub) => {
      const unsubscribeUrl = unsubscribeUrlFor(sub.unsubscribe_token);
      const mail = articleAnnouncementEmail(article, unsubscribeUrl);
      return {
        from: emailConfig.from,
        replyTo: emailConfig.replyTo,
        to: sub.email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        headers: listHeaders(unsubscribeUrl),
      };
    });

    const { error: batchError } = await resend.batch.send(payload);
    if (batchError) {
      failed += chunk.length;
      firstError ||= batchError.message;
    } else {
      sent += chunk.length;
    }
  }

  // Audit row so /admin can show what went out and when.
  await supabase.from("email_sends").insert({
    article_id: article.articleId ?? null,
    subject: article.title,
    recipients: subscribers.length,
    succeeded: sent,
    failed,
    sent_by: article.sentBy ?? null,
    error: firstError || null,
  });

  return {
    ok: failed === 0,
    sent,
    failed,
    message: failed
      ? `Sent to ${sent} subscriber${sent === 1 ? "" : "s"}, ${failed} failed. ${firstError}`
      : `Announcement sent to ${sent} subscriber${sent === 1 ? "" : "s"}.`,
  };
}
