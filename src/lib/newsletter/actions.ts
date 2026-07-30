"use server";

/**
 * Newsletter signup — single opt-in.
 *
 * A reader enters their address and is subscribed immediately: no
 * confirmation email to click, no pending state. Abuse is handled
 * up front instead, in this order:
 *
 *   1. honeypot field (catches naive bots for free)
 *   2. per-IP and per-address rate limiting
 *   3. captcha verification (Turnstile or reCAPTCHA, when configured)
 *   4. syntax/length/disposable-domain validation, optional MX lookup
 *   5. duplicate detection against the subscriber store
 *
 * The welcome email goes out through Resend after the record is written,
 * so a mail failure never costs us the subscription.
 */
import { welcomeEmail, unsubscribeHeaders } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/resend";
import { verifyCaptcha } from "@/lib/security/captcha";
import { domainAcceptsMail, validateEmail } from "@/lib/security/email";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { findSubscriber, upsertSubscriber, setSubscriberStatus } from "@/lib/store/subscribers";
import { verifyEmailToken } from "@/lib/security/tokens";
import type { SubscribeState, UnsubscribeState } from "./state";
import { unsubscribeUrls } from "./urls";

const GENERIC_ERROR =
  "We couldn't complete your signup just now. Please try again in a moment.";

export async function subscribeAction(
  _prevState: SubscribeState,
  formData: FormData
): Promise<SubscribeState> {
  try {
    // 1. Honeypot — a real reader never fills this hidden field in.
    if (String(formData.get("company") ?? "").trim()) {
      // Report success so bots get no signal about what tripped them up.
      return { status: "success", message: "You're subscribed. Watch for the Sunday Letter." };
    }

    const rawEmail = String(formData.get("email") ?? "");
    const captchaToken =
      (formData.get("cf-turnstile-response") as string | null) ??
      (formData.get("g-recaptcha-response") as string | null) ??
      (formData.get("captchaToken") as string | null);
    const source = String(formData.get("source") ?? "") || undefined;

    // 2. Rate limit by IP before doing any real work.
    const ip = await clientIp();
    const ipLimit = await rateLimit(`newsletter:ip:${ip}`, {
      limit: 5,
      windowSeconds: 600,
    });
    if (!ipLimit.allowed) {
      return {
        status: "error",
        message: "Too many signup attempts. Please try again in a few minutes.",
      };
    }

    // 3. Captcha (no-op when no provider is configured).
    const captcha = await verifyCaptcha(captchaToken, ip);
    if (!captcha.ok) {
      return { status: "error", message: captcha.error ?? GENERIC_ERROR };
    }

    // 4. Validation.
    const validation = validateEmail(rawEmail);
    if (!validation.ok) {
      return { status: "error", message: validation.error ?? GENERIC_ERROR };
    }
    const email = validation.email;

    const emailLimit = await rateLimit(`newsletter:email:${email}`, {
      limit: 3,
      windowSeconds: 3600,
    });
    if (!emailLimit.allowed) {
      return {
        status: "error",
        message: "Too many signup attempts for this address. Please try again later.",
      };
    }

    if (!(await domainAcceptsMail(email))) {
      return {
        status: "error",
        message: "That email domain can't receive mail. Please check the address.",
      };
    }

    // 5. Duplicate detection.
    const existing = await findSubscriber(email);
    if (existing?.status === "subscribed") {
      return {
        status: "success",
        alreadySubscribed: true,
        message: "You're already on the list — the next Sunday Letter is on its way.",
      };
    }

    const resubscribing = existing?.status === "unsubscribed";
    await upsertSubscriber(email, { status: "subscribed", source });

    // Welcome email. A delivery failure is logged, not surfaced: the
    // reader is subscribed either way.
    const urls = await unsubscribeUrls(email);
    const template = welcomeEmail({ email, unsubscribeUrl: urls.page });
    const result = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      headers: unsubscribeHeaders(urls.page, urls.oneClick),
    });
    if (result.sent) {
      await upsertSubscriber(email, { welcomeEmailSent: true });
    }

    return {
      status: "success",
      message: resubscribing
        ? "Welcome back — your subscription is active again."
        : "You're subscribed. Check your inbox for a welcome note.",
    };
  } catch (error) {
    console.error("[newsletter] signup failed", error);
    return { status: "error", message: GENERIC_ERROR };
  }
}

/**
 * Honors an opt-out immediately and free of charge, as CAN-SPAM
 * requires. The signed token proves the request came from a link we
 * sent, so no login is needed.
 */
export async function unsubscribeAction(
  _prevState: UnsubscribeState,
  formData: FormData
): Promise<UnsubscribeState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("token") ?? "");

  if (!email || !token || !(await verifyEmailToken(email, token))) {
    return {
      status: "error",
      message:
        "That unsubscribe link is no longer valid. Email us and we'll remove you right away.",
    };
  }

  const updated = await setSubscriberStatus(email, "unsubscribed");
  if (!updated) {
    // Nothing on file — the outcome the reader wanted is already true.
    return {
      status: "success",
      message: "You're unsubscribed. That address isn't on our list.",
    };
  }

  return {
    status: "success",
    message: "You're unsubscribed. You won't receive the Sunday Letter again.",
  };
}
