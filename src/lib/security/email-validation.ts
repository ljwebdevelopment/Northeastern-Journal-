/**
 * Email checks for public signup.
 *
 * With no confirmation click standing between a submission and the list, the
 * address has to be worth keeping at the moment it arrives.
 */

export interface EmailCheck {
  ok: boolean;
  /** Lowercased and trimmed — the form we store. */
  email: string;
  message?: string;
}

// Stricter than RFC 5322 on purpose: no quoted local parts, no IP literals,
// dotted domain with a 2+ character TLD.
const PATTERN =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

/** Throwaway providers. Not exhaustive — it catches the common ones. */
const DISPOSABLE = new Set([
  "0-mail.com", "10minutemail.com", "20minutemail.com", "discard.email",
  "dispostable.com", "fakeinbox.com", "getairmail.com", "getnada.com",
  "guerrillamail.com", "guerrillamail.info", "mailinator.com", "maildrop.cc",
  "mailnesia.com", "mintemail.com", "mohmal.com", "sharklasers.com",
  "spam4.me", "temp-mail.org", "tempmail.com", "tempmailo.com",
  "throwawaymail.com", "trashmail.com", "yopmail.com",
]);

/**
 * Reserved documentation/test domains from RFC 2606. Real mail never reaches
 * them, but placeholder rows carrying one are easy to leave behind in the
 * subscriber table.
 */
const PLACEHOLDER_DOMAINS = new Set([
  "example.com", "example.org", "example.net", "example.edu",
  "test.com", "localhost", "invalid",
]);

/**
 * Send-time check: is this address safe to hand to Resend?
 *
 * Distinct from `checkEmail`, which guards signup and additionally enforces
 * length limits and rejects disposable providers. This one only asks whether
 * an address already on the list can be delivered to — Resend's batch endpoint
 * rejects the *whole* batch when any single `to` is invalid, so one placeholder
 * row would otherwise kill the send for every valid subscriber beside it.
 */
export function isSendableEmail(raw: string): boolean {
  const email = (raw ?? "").trim().toLowerCase();

  if (!email) return false;
  if (!PATTERN.test(email)) return false;

  const domain = email.split("@")[1] as string;
  return !PLACEHOLDER_DOMAINS.has(domain);
}

export function checkEmail(raw: string): EmailCheck {
  const email = (raw ?? "").trim().toLowerCase();

  if (!email) return { ok: false, email, message: "Enter your email address." };
  if (email.length > 254) {
    return { ok: false, email, message: "That email address is too long." };
  }
  if (!PATTERN.test(email)) {
    return { ok: false, email, message: "Enter a valid email address." };
  }

  const [local, domain] = email.split("@") as [string, string];
  if (local.length > 64) {
    return { ok: false, email, message: "Enter a valid email address." };
  }
  if (DISPOSABLE.has(domain)) {
    return {
      ok: false,
      email,
      message: "Please use a permanent email address so we can reach you.",
    };
  }

  return { ok: true, email };
}
