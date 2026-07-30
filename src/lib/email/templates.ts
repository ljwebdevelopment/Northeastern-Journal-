/**
 * Newsletter email templates.
 *
 * Every message carries the CAN-SPAM essentials: the publisher's legal
 * name and physical postal address, a plain statement of why the reader
 * is receiving it, and a one-click opt-out link that needs no login and
 * costs nothing.
 */
import { siteConfig } from "@/lib/site-config";

export interface WelcomeEmailContext {
  email: string;
  unsubscribeUrl: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const BRAND = "#8b1e1e";

function layout({ title, body, unsubscribeUrl }: {
  title: string;
  body: string;
  unsubscribeUrl: string;
}): string {
  const { legalName, postalAddress, contactEmail } = siteConfig.publisher;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#faf8f5;font-family:Georgia,'Times New Roman',serif;color:#1e1e1e;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e6ddd2;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:${BRAND};padding:28px 32px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.8);">The Sunday Letter</p>
                <p style="margin:6px 0 0;font-size:26px;font-weight:bold;color:#ffffff;">${escapeHtml(siteConfig.name)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;font-size:16px;line-height:1.65;">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;border-top:1px solid #e6ddd2;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#666666;">
                <p style="margin:0 0 10px;">
                  You are receiving this email because you subscribed to the Sunday Letter at
                  <a href="${siteConfig.url}" style="color:${BRAND};">${escapeHtml(siteConfig.url.replace(/^https?:\/\//, ""))}</a>.
                </p>
                <p style="margin:0 0 10px;">
                  <a href="${unsubscribeUrl}" style="color:${BRAND};font-weight:bold;">Unsubscribe instantly</a>
                  &nbsp;&middot;&nbsp;
                  <a href="mailto:${escapeHtml(contactEmail)}" style="color:${BRAND};">Contact the editors</a>
                </p>
                <p style="margin:0;color:#8a8078;">
                  ${escapeHtml(legalName)}<br />${escapeHtml(postalAddress)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function welcomeEmail({ email, unsubscribeUrl }: WelcomeEmailContext) {
  const subject = "Welcome to the Sunday Letter";

  const html = layout({
    title: subject,
    unsubscribeUrl,
    body: `
      <p style="margin:0 0 18px;font-size:22px;font-weight:bold;">You're subscribed.</p>
      <p style="margin:0 0 16px;">
        Thank you for joining the ${escapeHtml(siteConfig.name)} family. Your subscription
        is active right now &mdash; there is nothing else to confirm.
      </p>
      <p style="margin:0 0 16px;">
        Every Sunday morning we send one email: civic reporting from our home
        communities, generational perspectives from the Journal family, and
        Cherokee Nana's column.
      </p>
      <p style="margin:0 0 24px;">
        While you wait for the first issue, browse the archive or catch up on
        what our contributors are writing.
      </p>
      <p style="margin:0 0 28px;">
        <a href="${siteConfig.url}/newsletter/archive"
           style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;padding:12px 22px;border-radius:999px;">
          Read the archive
        </a>
      </p>
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#666666;">
        Subscribed as ${escapeHtml(email)}.
      </p>
    `,
  });

  const text = [
    "You're subscribed.",
    "",
    `Thank you for joining the ${siteConfig.name} family. Your subscription is active right now — there is nothing else to confirm.`,
    "",
    "Every Sunday morning we send one email: civic reporting from our home communities, generational perspectives from the Journal family, and Cherokee Nana's column.",
    "",
    `Read the archive: ${siteConfig.url}/newsletter/archive`,
    "",
    `Subscribed as ${email}.`,
    "",
    "---",
    `You are receiving this email because you subscribed to the Sunday Letter at ${siteConfig.url}.`,
    `Unsubscribe instantly: ${unsubscribeUrl}`,
    `${siteConfig.publisher.legalName}, ${siteConfig.publisher.postalAddress}`,
  ].join("\n");

  return { subject, html, text };
}

/**
 * RFC 8058 one-click unsubscribe headers. Mailbox providers surface these
 * as a native "Unsubscribe" button next to the sender name.
 */
export function unsubscribeHeaders(unsubscribeUrl: string, oneClickUrl: string) {
  return {
    "List-Unsubscribe": `<${oneClickUrl}>, <${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
