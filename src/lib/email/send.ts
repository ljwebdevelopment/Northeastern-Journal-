import "server-only";

import { createAdminSupabase } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/env";
import { isSendableEmail } from "@/lib/security/email-validation";
import { emailConfig, getResend, isResendConfigured } from "./resend";
import {
  articleAnnouncementEmail,
  confirmSubscriptionEmail,
  newsletterIssueEmail,
  welcomeEmail,
  type ArticleAnnouncement,
  type NewsletterIssueView,
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

/** One rendered message, before it is addressed to anybody. */
type Rendered = { subject: string; html: string; text: string };

interface BroadcastOptions {
  /** Rendered per recipient, because the unsubscribe link differs for each. */
  render: (unsubscribeUrl: string) => Rendered;
  /** Subject recorded on the audit row. */
  subject: string;
  articleId?: string | null;
  newsletterIssueId?: string | null;
  sentBy?: string | null;
  /** Wording for the success message: "Announcement sent to 40 subscribers." */
  noun: string;
}

/**
 * Emails every confirmed subscriber, one message each.
 *
 * Each recipient gets their own message with their own unsubscribe token — no
 * shared "To" line, no exposed addresses. Sent through Resend's batch endpoint,
 * 100 at a time, and logged to `email_sends` either way.
 *
 * Idempotency is the caller's job. Articles guard on `notified_at`; newsletter
 * issues guard on `status`.
 */
async function broadcast(options: BroadcastOptions): Promise<SendResult> {
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

  // Resend's batch endpoint rejects the entire batch if a single `to` is
  // invalid, so a leftover placeholder row would take every valid address
  // beside it down with it. Drop the undeliverable ones up front and count
  // them as failures rather than letting them poison the send.
  const sendable = subscribers.filter((sub) => isSendableEmail(sub.email));
  const skipped = subscribers.length - sendable.length;
  const skippedNote = skipped
    ? `${skipped} address${skipped === 1 ? "" : "es"} skipped (placeholder or malformed).`
    : "";

  if (sendable.length === 0) {
    await supabase.from("email_sends").insert({
      article_id: options.articleId ?? null,
      newsletter_issue_id: options.newsletterIssueId ?? null,
      subject: options.subject,
      recipients: subscribers.length,
      succeeded: 0,
      failed: subscribers.length,
      sent_by: options.sentBy ?? null,
      error: `No deliverable addresses. ${skippedNote}`.trim(),
    });

    return {
      ok: false,
      sent: 0,
      failed: subscribers.length,
      message: `No deliverable addresses. ${skippedNote}`.trim(),
    };
  }

  const resend = getResend();
  let sent = 0;
  let failed = skipped;
  let firstError = "";

  for (let i = 0; i < sendable.length; i += RESEND_BATCH_LIMIT) {
    const chunk = sendable.slice(i, i + RESEND_BATCH_LIMIT);

    const payload = chunk.map((sub) => {
      const unsubscribeUrl = unsubscribeUrlFor(sub.unsubscribe_token);
      const mail = options.render(unsubscribeUrl);
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
    article_id: options.articleId ?? null,
    newsletter_issue_id: options.newsletterIssueId ?? null,
    subject: options.subject,
    recipients: subscribers.length,
    succeeded: sent,
    failed,
    sent_by: options.sentBy ?? null,
    error: [firstError, skippedNote].filter(Boolean).join(" ") || null,
  });

  return {
    ok: failed === 0,
    sent,
    failed,
    message: failed
      ? [
          `Sent to ${sent} subscriber${sent === 1 ? "" : "s"}, ${failed} failed.`,
          firstError,
          skippedNote,
        ]
          .filter(Boolean)
          .join(" ")
      : `${options.noun} sent to ${sent} subscriber${sent === 1 ? "" : "s"}.`,
  };
}

/** Emails a published article to every confirmed subscriber. */
export async function sendArticleAnnouncement(
  article: ArticleAnnouncement & { articleId?: string; sentBy?: string }
): Promise<SendResult> {
  return broadcast({
    render: (unsubscribeUrl) => articleAnnouncementEmail(article, unsubscribeUrl),
    subject: article.title,
    articleId: article.articleId ?? null,
    sentBy: article.sentBy ?? null,
    noun: "Announcement",
  });
}

/**
 * Emails one issue of the weekly newsletter to every confirmed subscriber.
 *
 * The caller flips the issue to `sent` before calling — see `sendIssue` in
 * `app/admin/newsletter/actions.ts` — so a double-submit cannot produce two
 * blasts.
 */
export async function sendNewsletterIssue(
  issue: NewsletterIssueView & { issueId?: string; sentBy?: string }
): Promise<SendResult> {
  return broadcast({
    render: (unsubscribeUrl) => newsletterIssueEmail(issue, unsubscribeUrl),
    subject: issue.title,
    newsletterIssueId: issue.issueId ?? null,
    sentBy: issue.sentBy ?? null,
    noun: `Issue No. ${issue.issueNumber}`,
  });
}

/**
 * Sends one copy of an issue to a single address so an editor can see it in a
 * real inbox before it goes out.
 *
 * Deliberately does not touch `email_sends` or the subscriber table: a test is
 * not a send, and showing it in the audit log would make it harder to tell what
 * subscribers actually received. The unsubscribe link points at a token that
 * matches nobody, so clicking it in a test cannot unsubscribe a real reader.
 */
export async function sendNewsletterTest(
  to: string,
  issue: NewsletterIssueView
): Promise<SendResult> {
  if (!isResendConfigured) {
    return { ok: false, sent: 0, failed: 1, message: "RESEND_API_KEY is not set." };
  }

  const unsubscribeUrl = unsubscribeUrlFor("test-send-not-a-real-token");
  const mail = newsletterIssueEmail(issue, unsubscribeUrl);

  const { error } = await getResend().emails.send({
    from: emailConfig.from,
    replyTo: emailConfig.replyTo,
    to,
    subject: `[Test] ${mail.subject}`,
    html: mail.html,
    text: mail.text,
  });

  if (error) return { ok: false, sent: 0, failed: 1, message: error.message };
  return { ok: true, sent: 1, failed: 0, message: `Test issue sent to ${to}.` };
}
