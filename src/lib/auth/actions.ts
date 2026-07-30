"use server";

import { redirect } from "next/navigation";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { authenticate } from "./accounts";
import { createSessionCookie, destroySessionCookie } from "./session";
import type { LoginState } from "./login-state";

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!email || !password) {
    return { status: "error", message: "Enter your email and password." };
  }

  // Throttle by IP and by account so a stolen address can't be brute-forced.
  const ip = await clientIp();
  const [ipLimit, accountLimit] = await Promise.all([
    rateLimit(`login:ip:${ip}`, { limit: 10, windowSeconds: 900 }),
    rateLimit(`login:account:${email.toLowerCase()}`, { limit: 5, windowSeconds: 900 }),
  ]);
  if (!ipLimit.allowed || !accountLimit.allowed) {
    return {
      status: "error",
      message: "Too many sign-in attempts. Please wait a few minutes and try again.",
    };
  }

  const account = await authenticate(email, password);
  if (!account) {
    return { status: "error", message: "That email and password don't match an account." };
  }

  await createSessionCookie(account.email);
  // Only ever redirect within this site.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/admin");
}

export async function logoutAction(): Promise<void> {
  await destroySessionCookie();
  redirect("/admin/login");
}
