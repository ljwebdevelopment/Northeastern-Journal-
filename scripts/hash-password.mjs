#!/usr/bin/env node
/**
 * Generates a password hash for an entry in NJ_ADMIN_ACCOUNTS.
 *
 *   npm run hash-password -- 'the password'
 *
 * Mirrors src/lib/auth/password.ts exactly: PBKDF2-SHA256, 210,000
 * iterations, 128-bit salt, formatted as
 * `pbkdf2:<iterations>:<saltBase64>:<hashBase64>`.
 *
 * The `:` separator keeps the hash safe to paste into a .env file, where
 * `$` would be expanded as a variable reference and corrupt it.
 */

const ITERATIONS = 210_000;
const KEY_LENGTH_BITS = 256;

const password = process.argv.slice(2).join(" ");
if (!password) {
  console.error("Usage: npm run hash-password -- 'your password'");
  process.exit(1);
}
if (password.length < 10) {
  console.error("Choose a password of at least 10 characters.");
  process.exit(1);
}

const toBase64 = (bytes) => Buffer.from(bytes).toString("base64");

const key = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(password.normalize("NFKC")),
  "PBKDF2",
  false,
  ["deriveBits"]
);
const salt = crypto.getRandomValues(new Uint8Array(16));
const bits = await crypto.subtle.deriveBits(
  { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
  key,
  KEY_LENGTH_BITS
);

console.log(`pbkdf2:${ITERATIONS}:${toBase64(salt)}:${toBase64(new Uint8Array(bits))}`);
