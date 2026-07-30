/**
 * HMAC-signed payloads, used for admin session cookies and for
 * unsubscribe links. Built on Web Crypto only, so the same code runs in
 * Node route handlers, server actions, and Edge middleware.
 */

const encoder = new TextEncoder();

function secret(): string {
  const value = process.env.NJ_AUTH_SECRET;
  if (value && value.length >= 16) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NJ_AUTH_SECRET must be set to a random string of at least 16 characters in production."
    );
  }
  // Development-only fallback so `npm run dev` works with no setup. Every
  // signed value is invalidated when a real secret is configured.
  return "northeastern-journal-development-secret";
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/** Raw HMAC-SHA256 of `value`, base64url encoded. */
export async function signValue(value: string): Promise<string> {
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(value));
  return base64UrlEncode(new Uint8Array(signature));
}

export async function verifyValue(value: string, signature: string): Promise<boolean> {
  try {
    return await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      base64UrlDecode(signature) as unknown as ArrayBuffer,
      encoder.encode(value)
    );
  } catch {
    return false;
  }
}

/** `<base64url(json)>.<signature>` */
export async function signPayload(payload: unknown): Promise<string> {
  const body = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  return `${body}.${await signValue(body)}`;
}

export async function readPayload<T>(token: string | undefined | null): Promise<T | null> {
  if (!token) return null;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;
  const body = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!(await verifyValue(body, signature))) return null;
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlDecode(body))) as T;
  } catch {
    return null;
  }
}

/**
 * Stable, unguessable token for an email address. Used for unsubscribe
 * links so they stay valid forever without a database lookup — a
 * CAN-SPAM requirement (opt-out links must work for at least 30 days
 * after a message is sent).
 */
export async function emailToken(email: string): Promise<string> {
  return signValue(`unsubscribe:${email.toLowerCase()}`);
}

export async function verifyEmailToken(email: string, token: string): Promise<boolean> {
  const expected = await emailToken(email);
  if (expected.length !== token.length) return false;
  // Constant-time comparison.
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}
