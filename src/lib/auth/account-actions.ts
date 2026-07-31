"use server";

/**
 * Account management from the dashboard.
 *
 * Two rules run through all of it:
 *
 * - Changing your own password or email requires re-entering your current
 *   password, so a borrowed session can't take over the account.
 * - The newsroom can never lock itself out: the last owner cannot be
 *   deleted or demoted, and an owner can't remove their own access while
 *   they're the only one left.
 */
import { revalidatePath } from "next/cache";
import { getCurrentAccount, createSessionCookie, destroySessionCookie } from "./session";
import {
  authenticate,
  changeAccountEmail,
  createAccount,
  deleteAccount,
  findAccount,
  ownerCount,
  setAccountPassword,
  updateAccountDetails,
  type AccountRole,
} from "./accounts";
import { rateLimit } from "@/lib/security/rate-limit";
import { MIN_PASSWORD_LENGTH, type AccountFormState } from "./account-state";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

const ok = (message: string): AccountFormState => ({
  status: "saved",
  message,
  errors: {},
});
const bad = (message: string, errors: Record<string, string> = {}): AccountFormState => ({
  status: "error",
  message,
  errors,
});

const text = (form: FormData, field: string) => String(form.get(field) ?? "").trim();

/* -------------------------------------------------------------------- */
/* Your own account                                                      */
/* -------------------------------------------------------------------- */

export async function updateMyDetailsAction(
  _prev: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const account = await getCurrentAccount();
  if (!account) return bad("Your session expired. Sign in again.");

  const name = text(formData, "name");
  if (!name) return bad("Please fix the highlighted field.", { name: "Your name is required." });

  await updateAccountDetails(account.email, { name });
  revalidatePath("/admin");
  return ok("Your details were saved.");
}

export async function changeMyPasswordAction(
  _prev: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const account = await getCurrentAccount();
  if (!account) return bad("Your session expired. Sign in again.");

  // Throttle: a valid session still shouldn't allow guessing the password.
  const limit = await rateLimit(`password-change:${account.email}`, {
    limit: 5,
    windowSeconds: 900,
  });
  if (!limit.allowed) {
    return bad("Too many attempts. Please wait a few minutes and try again.");
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!(await authenticate(account.email, currentPassword))) {
    return bad("Please fix the highlighted field.", {
      currentPassword: "That isn't your current password.",
    });
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return bad("Please fix the highlighted field.", {
      newPassword: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
    });
  }
  if (newPassword !== confirmPassword) {
    return bad("Please fix the highlighted field.", {
      confirmPassword: "The two passwords don't match.",
    });
  }

  await setAccountPassword(account.email, newPassword);
  return ok("Your password was changed. It takes effect immediately.");
}

export async function changeMyEmailAction(
  _prev: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const account = await getCurrentAccount();
  if (!account) return bad("Your session expired. Sign in again.");

  const limit = await rateLimit(`email-change:${account.email}`, {
    limit: 5,
    windowSeconds: 900,
  });
  if (!limit.allowed) {
    return bad("Too many attempts. Please wait a few minutes and try again.");
  }

  const nextEmail = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!EMAIL_PATTERN.test(nextEmail)) {
    return bad("Please fix the highlighted field.", {
      email: "Enter a valid email address.",
    });
  }
  if (!(await authenticate(account.email, password))) {
    return bad("Please fix the highlighted field.", {
      password: "That isn't your current password.",
    });
  }
  if (nextEmail !== account.email && (await findAccount(nextEmail))) {
    return bad("Please fix the highlighted field.", {
      email: "Another account already uses that address.",
    });
  }
  if (nextEmail === account.email) {
    return ok("That's already your sign-in address.");
  }

  await changeAccountEmail(account.email, nextEmail);
  // The session is keyed by email, so reissue it against the new address
  // rather than signing the user out mid-edit.
  await createSessionCookie(nextEmail);
  revalidatePath("/admin");
  return ok(`Your sign-in email is now ${nextEmail}.`);
}

/* -------------------------------------------------------------------- */
/* Managing other editors (owners only)                                  */
/* -------------------------------------------------------------------- */

async function requireOwner() {
  const account = await getCurrentAccount();
  if (!account) return { error: bad("Your session expired. Sign in again.") };
  if (account.role !== "owner") {
    return { error: bad("Only owners can manage accounts.") };
  }
  return { account };
}

export async function createAccountAction(
  _prev: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const { error } = await requireOwner();
  if (error) return error;

  const email = text(formData, "email").toLowerCase();
  const name = text(formData, "name");
  const password = String(formData.get("password") ?? "");
  const role: AccountRole = text(formData, "role") === "owner" ? "owner" : "author";
  const authorSlug = text(formData, "authorSlug") || undefined;

  const errors: Record<string, string> = {};
  if (!name) errors.name = "A name is required.";
  if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (Object.keys(errors).length > 0) {
    return bad("Please fix the highlighted fields.", errors);
  }
  if (await findAccount(email)) {
    return bad("Please fix the highlighted fields.", {
      email: "An account with that email already exists.",
    });
  }

  await createAccount({ email, name, password, role, authorSlug });
  revalidatePath("/admin/account");
  return ok(`${name} can now sign in.`);
}

export async function updateAccountAction(
  _prev: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const { account, error } = await requireOwner();
  if (error) return error;

  const email = text(formData, "email").toLowerCase();
  const target = await findAccount(email);
  if (!target) return bad("That account no longer exists.");

  const name = text(formData, "name") || target.name;
  const role: AccountRole = text(formData, "role") === "owner" ? "owner" : "author";
  const authorSlug = text(formData, "authorSlug") || undefined;

  // Never let the last owner demote themselves out of existence.
  if (target.role === "owner" && role !== "owner" && (await ownerCount()) <= 1) {
    return bad("This is the only owner account — promote someone else first.");
  }
  if (target.email === account!.email && role !== "owner") {
    return bad("You can't remove your own owner access. Ask another owner to do it.");
  }

  await updateAccountDetails(email, { name, role, authorSlug });
  revalidatePath("/admin/account");
  return ok(`${name}'s account was updated.`);
}

export async function resetAccountPasswordAction(
  _prev: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const { error } = await requireOwner();
  if (error) return error;

  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  const target = await findAccount(email);
  if (!target) return bad("That account no longer exists.");
  if (password.length < MIN_PASSWORD_LENGTH) {
    return bad("Please fix the highlighted field.", {
      password: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
    });
  }

  await setAccountPassword(email, password);
  return ok(`${target.name}'s password was reset. Share it with them directly.`);
}

export async function deleteAccountAction(
  _prev: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const { account, error } = await requireOwner();
  if (error) return error;

  const email = text(formData, "email").toLowerCase();
  const target = await findAccount(email);
  if (!target) return ok("That account is already gone.");

  if (target.email === account!.email) {
    return bad("You can't delete the account you're signed in with.");
  }
  if (target.role === "owner" && (await ownerCount()) <= 1) {
    return bad("This is the only owner account — it can't be removed.");
  }

  await deleteAccount(email);
  revalidatePath("/admin/account");
  return ok(`${target.name}'s access was removed.`);
}

/** Signs the current session out — used after sensitive changes. */
export async function signOutAction(): Promise<void> {
  await destroySessionCookie();
}
