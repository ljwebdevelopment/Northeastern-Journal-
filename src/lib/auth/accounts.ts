/**
 * Dashboard accounts.
 *
 * Accounts live in the `NJ_ADMIN_ACCOUNTS` environment variable as a JSON
 * array, so adding an editor never requires a code change:
 *
 *   NJ_ADMIN_ACCOUNTS='[
 *     {"email":"nana@northeasternjournal.com","name":"Cherokee Nana",
 *      "authorSlug":"cherokee-nana","role":"owner",
 *      "passwordHash":"pbkdf2:210000:<salt>:<hash>"},
 *     {"email":"miles@northeasternjournal.com","name":"Miles Carter",
 *      "authorSlug":"miles-carter","role":"author",
 *      "passwordHash":"pbkdf2:210000:<salt>:<hash>"}
 *   ]'
 *
 * Generate a hash with `npm run hash-password -- 'your password'`.
 *
 * `role: "owner"` may edit every author profile; `role: "author"` may edit
 * only their own.
 */
import { hashPassword, verifyPassword } from "./password";

export type AccountRole = "owner" | "author";

export interface AdminAccount {
  email: string;
  name: string;
  /** Author profile this account owns, if any. */
  authorSlug?: string;
  role: AccountRole;
}

interface StoredAccount extends AdminAccount {
  passwordHash?: string;
  /** Plaintext alternative — convenient for a first run, not for production. */
  password?: string;
}

const DEV_ACCOUNT: StoredAccount = {
  email: "editor@northeasternjournal.com",
  name: "Demo Editor",
  authorSlug: "cherokee-nana",
  role: "owner",
  password: "northeastern",
};

function parseAccounts(): StoredAccount[] {
  const raw = process.env.NJ_ADMIN_ACCOUNTS;
  if (!raw) {
    if (process.env.NODE_ENV === "production") return [];
    return [DEV_ACCOUNT];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("expected an array");
    return parsed
      .filter((entry): entry is StoredAccount => Boolean(entry?.email))
      .map((entry) => ({
        ...entry,
        email: String(entry.email).toLowerCase(),
        name: entry.name || String(entry.email),
        role: entry.role === "owner" ? "owner" : "author",
      }));
  } catch (error) {
    console.error("[auth] NJ_ADMIN_ACCOUNTS is not valid JSON; no one can sign in.", error);
    return [];
  }
}

const publicShape = ({ email, name, authorSlug, role }: StoredAccount): AdminAccount => ({
  email,
  name,
  authorSlug,
  role,
});

export function listAccounts(): AdminAccount[] {
  return parseAccounts().map(publicShape);
}

export function findAccount(email: string): AdminAccount | undefined {
  const match = parseAccounts().find((a) => a.email === email.toLowerCase());
  return match ? publicShape(match) : undefined;
}

/** True when no accounts are configured at all — the dashboard is unusable. */
export function accountsConfigured(): boolean {
  return parseAccounts().length > 0;
}

/** True when running on the built-in development account. */
export function usingDevAccount(): boolean {
  return !process.env.NJ_ADMIN_ACCOUNTS && process.env.NODE_ENV !== "production";
}

export async function authenticate(
  email: string,
  password: string
): Promise<AdminAccount | null> {
  const account = parseAccounts().find((a) => a.email === email.trim().toLowerCase());

  if (!account) {
    // Hash anyway so a missing account and a wrong password take a
    // comparable amount of time.
    await hashPassword(password);
    return null;
  }

  if (account.passwordHash) {
    const valid = await verifyPassword(password, account.passwordHash);
    return valid ? publicShape(account) : null;
  }
  if (account.password) {
    const expected = account.password;
    const valid =
      expected.length === password.length &&
      // Constant-time-ish comparison for the plaintext escape hatch.
      [...expected].reduce(
        (diff, char, i) => diff | (char.charCodeAt(0) ^ password.charCodeAt(i)),
        0
      ) === 0;
    return valid ? publicShape(account) : null;
  }
  return null;
}

/** Can this account edit the given author profile? */
export function canEditAuthor(account: AdminAccount, authorSlug: string): boolean {
  return account.role === "owner" || account.authorSlug === authorSlug;
}
