/**
 * Email address validation for newsletter signup: syntax, length,
 * throwaway-domain screening, and (optionally) a live MX lookup.
 */

export interface EmailValidationResult {
  ok: boolean;
  /** Lowercased, trimmed address — the canonical form we store. */
  email: string;
  error?: string;
}

// Deliberately stricter than RFC 5322: no quoted local parts, no IP
// literals, requires a dotted domain with a 2+ character TLD.
const EMAIL_PATTERN =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

/** Common disposable/throwaway providers, blocked to keep the list clean. */
const DISPOSABLE_DOMAINS = new Set([
  "0-mail.com",
  "10minutemail.com",
  "20minutemail.com",
  "discard.email",
  "dispostable.com",
  "fakeinbox.com",
  "getairmail.com",
  "getnada.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "mailinator.com",
  "maildrop.cc",
  "mailnesia.com",
  "mintemail.com",
  "mohmal.com",
  "sharklasers.com",
  "spam4.me",
  "temp-mail.org",
  "tempmail.com",
  "tempmailo.com",
  "throwawaymail.com",
  "trashmail.com",
  "yopmail.com",
]);

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateEmail(raw: string): EmailValidationResult {
  const email = normalizeEmail(raw ?? "");

  if (!email) {
    return { ok: false, email, error: "Please enter your email address." };
  }
  if (email.length > 254) {
    return { ok: false, email, error: "That email address is too long." };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, email, error: "Please enter a valid email address." };
  }

  const [localPart, domain] = email.split("@") as [string, string];
  if (localPart.length > 64) {
    return { ok: false, email, error: "Please enter a valid email address." };
  }
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      ok: false,
      email,
      error: "Please use a permanent email address so we can reach you.",
    };
  }

  return { ok: true, email };
}

/**
 * Optional DNS check that the domain can actually receive mail. Off by
 * default (it adds latency); enable with `NJ_VERIFY_MX=true`. Never
 * blocks signup when the lookup itself fails.
 */
export async function domainAcceptsMail(email: string): Promise<boolean> {
  if (process.env.NJ_VERIFY_MX !== "true") return true;
  const domain = email.split("@")[1];
  if (!domain) return false;
  try {
    const dns = await import("node:dns/promises");
    const records = await dns.resolveMx(domain);
    return records.length > 0;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    // A definitive "this domain has no mail records" answer is a rejection;
    // any other failure (timeout, no network) is treated as inconclusive.
    if (code === "ENOTFOUND" || code === "ENODATA") return false;
    return true;
  }
}
