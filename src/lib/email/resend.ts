import "server-only";

import { Resend } from "resend";
import { siteConfig } from "@/lib/site-config";

/**
 * Resend configuration.
 *
 * `NEWSLETTER_FROM` must be an address on a domain you have verified in
 * Resend (Dashboard → Domains). Until a domain is verified, Resend only
 * accepts sends to the address that owns the account, which is enough for
 * local testing.
 */
const apiKey = process.env.RESEND_API_KEY ?? "";

export const isResendConfigured = Boolean(apiKey);

export const emailConfig = {
  from: process.env.NEWSLETTER_FROM ?? "Northeastern Journal <newsletter@northeasternjournal.com>",
  replyTo: process.env.NEWSLETTER_REPLY_TO ?? "editor@northeasternjournal.com",
  /**
   * Physical mailing address. CAN-SPAM requires a valid postal address in
   * every commercial email; it renders in the footer of all templates.
   */
  mailingAddress:
    process.env.NEWSLETTER_MAILING_ADDRESS ??
    "Northeastern Journal, Northeastern Oklahoma, USA",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.url,
};

let client: Resend | null = null;

export function getResend(): Resend {
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set. Email sending is disabled.");
  }
  client ??= new Resend(apiKey);
  return client;
}
