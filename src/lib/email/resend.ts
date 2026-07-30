/**
 * Resend transport. Uses the REST API over `fetch` so no SDK dependency
 * is required. When `RESEND_API_KEY` is unset, emails are logged instead
 * of sent, which keeps local development and preview builds working.
 */
import { siteConfig } from "@/lib/site-config";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Extra headers, e.g. `List-Unsubscribe` for one-click opt-out. */
  headers?: Record<string, string>;
  replyTo?: string;
}

export interface SendEmailResult {
  sent: boolean;
  id?: string;
  skipped?: boolean;
  error?: string;
}

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function fromAddress(): string {
  return (
    process.env.NEWSLETTER_FROM_EMAIL ??
    `${siteConfig.name} <newsletter@northeasternjournal.com>`
  );
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.info(
      `[email] RESEND_API_KEY not set — skipped "${options.subject}" to ${options.to}`
    );
    return { sent: false, skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        headers: options.headers,
        reply_to: options.replyTo ?? process.env.NEWSLETTER_REPLY_TO,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error(`[email] Resend rejected the request (${res.status}): ${detail}`);
      return { sent: false, error: `Resend responded with ${res.status}` };
    }

    const body = (await res.json()) as { id?: string };
    return { sent: true, id: body.id };
  } catch (error) {
    console.error("[email] Resend request failed", error);
    return { sent: false, error: "Email delivery failed" };
  }
}
