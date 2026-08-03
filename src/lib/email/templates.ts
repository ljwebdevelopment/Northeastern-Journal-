import "server-only";

import { emailConfig } from "./resend";
import { siteConfig } from "@/lib/site-config";

/**
 * Hand-written email HTML.
 *
 * Deliberately plain: tables, inline styles, no external CSS, no web fonts,
 * no images beyond the article's own. That is what survives Gmail, Outlook,
 * and Apple Mail intact. The palette matches the site's masthead red so the
 * emails feel like the paper without importing its stylesheet.
 */

const BRAND = "#8b1e1e";
const INK = "#1e1e1e";
const MUTED = "#666666";
const PAPER = "#faf8f5";
const BORDER = "#e6ddd2";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

interface LayoutOptions {
  preheader: string;
  body: string;
  /** Omitted for transactional mail (confirmation), required for broadcasts. */
  unsubscribeUrl?: string;
}

/**
 * The preferences page for whoever this message is addressed to.
 *
 * Both links are keyed by the same token, so rather than thread a second URL
 * through every template this reads it back off the unsubscribe link. Falls
 * back to the bare page — which explains that it needs a link from an email —
 * if the URL ever arrives without one.
 */
function preferencesUrlFrom(unsubscribeUrl: string): string {
  const token = /[?&]token=([^&]+)/.exec(unsubscribeUrl)?.[1];
  return token
    ? `${emailConfig.siteUrl}/newsletter/preferences?token=${token}`
    : `${emailConfig.siteUrl}/newsletter/preferences`;
}

function layout({ preheader, body, unsubscribeUrl }: LayoutOptions): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${escapeHtml(siteConfig.name)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">

          <tr><td style="height:4px;background:${BRAND};"></td></tr>

          <tr>
            <td style="padding:28px 32px 8px 32px;text-align:center;">
              <a href="${emailConfig.siteUrl}" style="text-decoration:none;">
                <span style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:${INK};letter-spacing:-0.01em;">
                  Northeastern <span style="color:${BRAND};">Journal</span>
                </span>
              </a>
              <div style="margin-top:6px;font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};">
                Independent News for Northeastern Oklahoma
              </div>
            </td>
          </tr>

          <tr><td style="padding:0 32px;"><div style="border-top:1px solid ${BORDER};margin:20px 0 0 0;"></div></td></tr>

          <tr><td style="padding:24px 32px 32px 32px;">${body}</td></tr>

          <tr>
            <td style="padding:20px 32px 28px 32px;background:${PAPER};border-top:1px solid ${BORDER};font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${MUTED};text-align:center;">
              <p style="margin:0 0 8px 0;">
                <a href="${emailConfig.siteUrl}" style="color:${MUTED};">northeasternjournal.com</a>
              </p>
              <p style="margin:0 0 8px 0;">${escapeHtml(emailConfig.mailingAddress)}</p>
              ${
                unsubscribeUrl
                  ? `<p style="margin:0;">
                       You're receiving this because you subscribed to the Northeastern Journal newsletter.<br />
                       <a href="${preferencesUrlFrom(unsubscribeUrl)}" style="color:${MUTED};text-decoration:underline;">Email preferences</a>
                       &nbsp;·&nbsp;
                       <a href="${unsubscribeUrl}" style="color:${BRAND};text-decoration:underline;">Unsubscribe</a>
                       &nbsp;·&nbsp;
                       <a href="${emailConfig.siteUrl}/privacy" style="color:${MUTED};">Privacy</a>
                     </p>`
                  : `<p style="margin:0;">This is a one-time message about your subscription request.</p>`
              }
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const button = (href: string, label: string) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="border-radius:999px;background:${BRAND};">
        <a href="${href}"
           style="display:inline-block;padding:13px 30px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>`;

// ---------------------------------------------------------------------------
// Double opt-in confirmation
// ---------------------------------------------------------------------------

export function confirmSubscriptionEmail(confirmUrl: string) {
  const body = `
    <h1 style="margin:0 0 12px 0;font-family:Georgia,serif;font-size:24px;line-height:1.25;color:${INK};">
      Confirm your subscription
    </h1>
    <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:${INK};">
      Tap the button below to start receiving the Northeastern Journal newsletter.
      We won't send you anything until you do.
    </p>
    ${button(confirmUrl, "Confirm Subscription")}
    <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:${MUTED};">
      If the button doesn't work, copy this link into your browser:<br />
      <a href="${confirmUrl}" style="color:${BRAND};word-break:break-all;">${confirmUrl}</a>
    </p>
    <p style="margin:20px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:${MUTED};">
      Didn't sign up? Ignore this email and nothing will happen — the request expires on its own.
    </p>`;

  return {
    subject: "Confirm your Northeastern Journal subscription",
    html: layout({ preheader: "One tap to confirm your subscription.", body }),
    text: `Confirm your Northeastern Journal subscription:\n\n${confirmUrl}\n\nDidn't sign up? Ignore this email.`,
  };
}

// ---------------------------------------------------------------------------
// Welcome (sent after confirmation)
// ---------------------------------------------------------------------------

export function welcomeEmail(unsubscribeUrl: string) {
  const body = `
    <h1 style="margin:0 0 12px 0;font-family:Georgia,serif;font-size:24px;line-height:1.25;color:${INK};">
      You're subscribed
    </h1>
    <p style="margin:0 0 14px 0;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:${INK};">
      Thanks for reading. You'll get our reporting from across northeastern
      Oklahoma — local government, schools, culture, and the community voices
      that don't make it into the wire copy.
    </p>
    <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:${INK};">
      We send when there's something worth your time, and never sell or share
      your address.
    </p>
    ${button(emailConfig.siteUrl, "Read the Journal")}`;

  return {
    subject: "Welcome to the Northeastern Journal",
    html: layout({ preheader: "You're on the list. Here's what to expect.", body, unsubscribeUrl }),
    text: `You're subscribed to the Northeastern Journal.\n\nRead: ${emailConfig.siteUrl}\n\nUnsubscribe: ${unsubscribeUrl}`,
  };
}

// ---------------------------------------------------------------------------
// New article announcement
// ---------------------------------------------------------------------------

export interface ArticleAnnouncement {
  title: string;
  excerpt: string;
  url: string;
  imageUrl?: string | null;
  imageAlt?: string;
  authorName?: string | null;
  publishedAt: string;
  categoryName?: string | null;
  readingMinutes?: number;
}

export function articleAnnouncementEmail(
  article: ArticleAnnouncement,
  unsubscribeUrl: string
) {
  const date = new Date(article.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const byline = [
    article.authorName ? `By ${escapeHtml(article.authorName)}` : null,
    date,
    article.readingMinutes ? `${article.readingMinutes} min read` : null,
  ]
    .filter(Boolean)
    .join(" &nbsp;·&nbsp; ");

  const image = article.imageUrl
    ? `<a href="${article.url}" style="display:block;">
         <img src="${article.imageUrl}" alt="${escapeHtml(article.imageAlt ?? "")}"
              width="536"
              style="display:block;width:100%;max-width:536px;height:auto;border-radius:8px;border:0;margin:0 0 22px 0;" />
       </a>`
    : "";

  const kicker = article.categoryName
    ? `<div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:${BRAND};margin:0 0 10px 0;">
         ${escapeHtml(article.categoryName)}
       </div>`
    : "";

  const body = `
    ${kicker}
    ${image}
    <h1 style="margin:0 0 10px 0;font-family:Georgia,serif;font-size:27px;line-height:1.22;color:${INK};">
      <a href="${article.url}" style="color:${INK};text-decoration:none;">${escapeHtml(article.title)}</a>
    </h1>
    <div style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${MUTED};margin:0 0 18px 0;">
      ${byline}
    </div>
    <p style="margin:0;font-family:Georgia,serif;font-size:16px;line-height:1.7;color:${INK};">
      ${escapeHtml(article.excerpt)}
    </p>
    ${button(article.url, "Read Article")}`;

  return {
    subject: article.title,
    html: layout({ preheader: article.excerpt.slice(0, 140), body, unsubscribeUrl }),
    text: `${article.title}\n\n${article.excerpt}\n\nRead: ${article.url}\n\nUnsubscribe: ${unsubscribeUrl}`,
  };
}
