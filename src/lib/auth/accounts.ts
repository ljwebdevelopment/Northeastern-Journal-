/**
 * Dashboard accounts.
 *
 * Accounts are seeded from the `NJ_ADMIN_ACCOUNTS` environment variable
 * and then maintained from the dashboard's Account page. The env var is
 * the bootstrap — it gets the first owner in — while every later change
 * (password, name, added or removed editors) is written to the store and
 * merged over the seed on read. That means routine account admin never
 * requires editing an environment variable or redeploying.
 *
 *   NJ_ADMIN_ACCOUNTS='[
 *     {"email":"nana@northeasternjournal.com","name":"Cherokee Nana",
 *      "authorSlug":"cherokee-nana","role":"owner",
 *      "passwordHash":"pbkdf2:210000:<salt>:<hash>"}
 *   ]'
 *
 * Generate a hash with `npm run hash-password -- 'your password'`.
 *
 * `role: "owner"` may edit every author profile and manage accounts;
 * `role: "author"` may edit only their own profile and password.
 */
import { getStore } from "@/lib/store/driver";
import { hashPassword, verifyPassword } from "./password";

export type AccountRole = "owner" | "author";

export interface AdminAccount {
  email: string;
  name: string;
  /** Author profile this account owns, if any. */
  authorSlug?: string;
  role: AccountRole;
  /** True when the record came from the store rather than the env seed. */
  managed?: boolean;
}

interface StoredAccount extends AdminAccount {
  passwordHash?: string;
  /** Plaintext alternative — convenient for a first run, not for production. */
  password?: string;
  /** Tombstone for a seeded account removed from the dashboard. */
  deleted?: boolean;
}

const ACCOUNTS_KEY = "admin-accounts";

const DEV_ACCOUNT: StoredAccount = {
  email: "editor@northeasternjournal.com",
  name: "Demo Editor",
  authorSlug: "cherokee-nana",
  role: "owner",
  password: "northeastern",
};

const normalizeEmail = (value: string) => String(value).trim().toLowerCase();

/** Accounts as defined by the environment seed. */
function seedAccounts(): StoredAccount[] {
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
        email: normalizeEmail(entry.email),
        name: entry.name || String(entry.email),
        role: entry.role === "owner" ? "owner" : "author",
      }));
  } catch (error) {
    console.error("[auth] NJ_ADMIN_ACCOUNTS is not valid JSON; falling back to stored accounts.", error);
    return [];
  }
}

type OverrideMap = Record<string, StoredAccount>;

async function readOverrides(): Promise<OverrideMap> {
  return (await getStore().get<OverrideMap>(ACCOUNTS_KEY)) ?? {};
}

async function writeOverrides(overrides: OverrideMap): Promise<void> {
  await getStore().set(ACCOUNTS_KEY, overrides);
}

/** Seed merged with stored changes — the real account list. */
async function allAccounts(): Promise<StoredAccount[]> {
  const overrides = await readOverrides();
  const merged = new Map<string, StoredAccount>();

  for (const account of seedAccounts()) merged.set(account.email, account);

  for (const [email, override] of Object.entries(overrides)) {
    if (override.deleted) {
      merged.delete(email);
      continue;
    }
    const existing = merged.get(email);
    merged.set(email, {
      ...existing,
      ...override,
      email,
      managed: true,
      // A stored passwordHash always supersedes a seeded plaintext password.
      ...(override.passwordHash ? { password: undefined } : {}),
    });
  }

  return [...merged.values()];
}

const publicShape = ({ email, name, authorSlug, role, managed }: StoredAccount): AdminAccount => ({
  email,
  name,
  authorSlug,
  role,
  managed,
});

export async function listAccounts(): Promise<AdminAccount[]> {
  const accounts = await allAccounts();
  return accounts
    .map(publicShape)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function findAccount(email: string): Promise<AdminAccount | undefined> {
  const accounts = await allAccounts();
  const match = accounts.find((a) => a.email === normalizeEmail(email));
  return match ? publicShape(match) : undefined;
}

/** True when no accounts exist at all — the dashboard is unusable. */
export async function accountsConfigured(): Promise<boolean> {
  return (await allAccounts()).length > 0;
}

/** True when the only account available is the built-in development one. */
export async function usingDevAccount(): Promise<boolean> {
  if (process.env.NJ_ADMIN_ACCOUNTS || process.env.NODE_ENV === "production") return false;
  const overrides = await readOverrides();
  return Object.keys(overrides).length === 0;
}

export async function authenticate(
  email: string,
  password: string
): Promise<AdminAccount | null> {
  const accounts = await allAccounts();
  const account = accounts.find((a) => a.email === normalizeEmail(email));

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

/* -------------------------------------------------------------------- */
/* Mutations — used by the dashboard's Account page                      */
/* -------------------------------------------------------------------- */

/**
 * Writes an override for `email`, carrying forward the account's current
 * values so a partial edit never drops the fields it didn't touch.
 */
async function upsertAccount(email: string, patch: Partial<StoredAccount>): Promise<void> {
  const key = normalizeEmail(email);
  const accounts = await allAccounts();
  const current = accounts.find((a) => a.email === key);
  const overrides = await readOverrides();

  overrides[key] = {
    ...current,
    ...overrides[key],
    ...patch,
    email: key,
    managed: true,
    deleted: false,
  };
  await writeOverrides(overrides);
}

export async function setAccountPassword(email: string, password: string): Promise<void> {
  await upsertAccount(email, {
    passwordHash: await hashPassword(password),
    password: undefined,
  });
}

export async function updateAccountDetails(
  email: string,
  details: { name?: string; authorSlug?: string; role?: AccountRole }
): Promise<void> {
  await upsertAccount(email, details);
}

/**
 * Changes the address an account signs in with. The record moves to the
 * new key and the old address is tombstoned so a seeded entry doesn't
 * resurrect it.
 */
export async function changeAccountEmail(
  currentEmail: string,
  nextEmail: string
): Promise<void> {
  const from = normalizeEmail(currentEmail);
  const to = normalizeEmail(nextEmail);
  if (from === to) return;

  const accounts = await allAccounts();
  const account = accounts.find((a) => a.email === from);
  if (!account) throw new Error("Account not found");

  const overrides = await readOverrides();
  overrides[to] = { ...account, ...overrides[from], email: to, managed: true, deleted: false };
  // Tombstone rather than delete: the old address may still be in the seed.
  overrides[from] = { email: from, name: account.name, role: account.role, deleted: true };
  await writeOverrides(overrides);
}

export async function createAccount(account: {
  email: string;
  name: string;
  password: string;
  role: AccountRole;
  authorSlug?: string;
}): Promise<void> {
  const key = normalizeEmail(account.email);
  const existing = await findAccount(key);
  if (existing) throw new Error("An account with that email already exists");

  const overrides = await readOverrides();
  overrides[key] = {
    email: key,
    name: account.name,
    role: account.role,
    authorSlug: account.authorSlug,
    passwordHash: await hashPassword(account.password),
    managed: true,
    deleted: false,
  };
  await writeOverrides(overrides);
}

export async function deleteAccount(email: string): Promise<void> {
  const key = normalizeEmail(email);
  const accounts = await allAccounts();
  const account = accounts.find((a) => a.email === key);
  if (!account) return;

  const overrides = await readOverrides();
  // Tombstone so a seeded account stays deleted across restarts.
  overrides[key] = { email: key, name: account.name, role: account.role, deleted: true };
  await writeOverrides(overrides);
}

/** Owners still standing after a prospective change — used to guarantee
 *  the newsroom can never lock itself out. */
export async function ownerCount(): Promise<number> {
  const accounts = await allAccounts();
  return accounts.filter((a) => a.role === "owner").length;
}
