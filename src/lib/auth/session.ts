/**
 * Dashboard sessions: an HMAC-signed, httpOnly cookie. No database
 * lookup is needed to read one, so Edge middleware can gate `/admin`
 * before a request ever reaches a page.
 */
import { cookies } from "next/headers";
import { readPayload, signPayload } from "@/lib/security/tokens";
import { findAccount, type AdminAccount } from "./accounts";

export const SESSION_COOKIE = "nj_admin_session";
const SESSION_DAYS = 14;

interface SessionPayload {
  sub: string;
  /** Expiry, epoch seconds. */
  exp: number;
}

export async function createSessionCookie(email: string): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;
  const token = await signPayload({ sub: email.toLowerCase(), exp } satisfies SessionPayload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Validates a raw cookie value. Safe to call from middleware. */
export async function readSessionToken(token: string | undefined): Promise<string | null> {
  const payload = await readPayload<SessionPayload>(token);
  if (!payload?.sub || typeof payload.exp !== "number") return null;
  if (payload.exp * 1000 <= Date.now()) return null;
  return payload.sub;
}

/** The signed-in account, or null. Resolves the account on every call so
 *  revoking access is a matter of editing `NJ_ADMIN_ACCOUNTS`. */
export async function getCurrentAccount(): Promise<AdminAccount | null> {
  const store = await cookies();
  const email = await readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!email) return null;
  return findAccount(email) ?? null;
}
