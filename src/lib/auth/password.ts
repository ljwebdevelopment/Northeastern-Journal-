/**
 * PBKDF2 password hashing on Web Crypto, so the same helpers work in
 * route handlers, server actions, and the password-hashing CLI script.
 *
 * Hash format: `pbkdf2:<iterations>:<saltBase64>:<hashBase64>`
 *
 * The separator is `:` rather than the more conventional `$` on purpose.
 * These hashes live inside `NJ_ADMIN_ACCOUNTS`, and Next.js runs `.env`
 * files through dotenv-expand, which treats `$name` as a variable
 * reference — a `$`-separated hash gets silently mangled before the app
 * ever reads it, and every sign-in fails with no clue why. Base64 never
 * contains `:`, so this separator is unambiguous and env-safe.
 */

const ITERATIONS = 210_000;
const KEY_LENGTH_BITS = 256;
const encoder = new TextEncoder();

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const fromBase64 = (value: string) =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

async function derive(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as unknown as ArrayBuffer,
      iterations,
      hash: "SHA-256",
    },
    key,
    KEY_LENGTH_BITS
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2:${ITERATIONS}:${toBase64(salt)}:${toBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") {
    // A hash that starts right but lost its structure is almost always
    // dotenv variable expansion eating `$`-separated segments. Say so,
    // because the alternative is an unexplained "password doesn't match".
    if (stored.startsWith("pbkdf2")) {
      console.error(
        "[auth] Malformed password hash. If it came from an older `pbkdf2$...` " +
          "format, regenerate it with `npm run hash-password` — `$` is expanded " +
          "by .env parsing and corrupts the hash."
      );
    }
    return false;
  }

  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  try {
    const salt = fromBase64(parts[2]!);
    const expected = fromBase64(parts[3]!);
    const actual = await derive(password, salt, iterations);
    if (actual.length !== expected.length) return false;

    let diff = 0;
    for (let i = 0; i < actual.length; i += 1) diff |= actual[i]! ^ expected[i]!;
    return diff === 0;
  } catch {
    return false;
  }
}
