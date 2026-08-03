"use client";

import { useCallback, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { CaptchaWidget } from "./captcha-widget";

const MAX_BODY = 6000;

/**
 * The letters form.
 *
 * It says plainly what happens next, because the honest answer — an editor
 * reads it, and most letters aren't printed — is better than an ambiguous
 * "thanks!" that leaves someone waiting for a publication that never comes.
 * The address is required and never printed; the form says both.
 */
export function LetterForm({
  articleSlug,
  articleTitle,
}: {
  articleSlug?: string;
  articleTitle?: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [body, setBody] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [company, setCompany] = useState("");

  const onToken = useCallback((token: string) => setCaptchaToken(token), []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("sending");
    setMessage("");

    try {
      const response = await fetch("/api/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          location: form.get("location"),
          subject: form.get("subject"),
          body: form.get("body"),
          articleSlug,
          company,
          captchaToken,
        }),
      });
      const data = (await response.json()) as { ok: boolean; message: string };
      setMessage(data.message);
      setState(data.ok ? "done" : "error");
    } catch {
      setState("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <MailCheck className="mx-auto h-8 w-8 text-brand" aria-hidden="true" />
        <h2 className="mt-4 font-serif text-2xl font-bold">Letter received</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
      {articleTitle && (
        <p className="mb-6 rounded-lg bg-surface-muted px-4 py-3 text-sm">
          <span className="text-muted">In response to</span>{" "}
          <span className="font-semibold">{articleTitle}</span>
        </p>
      )}

      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="letter-company">Company</label>
        <input
          id="letter-company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      {/* The grid owns the spacing here, so cancel the fields' own top margin
          or the second column sits a row lower than the first. */}
      <div className="grid gap-4 sm:grid-cols-2 [&>label]:mt-0">
        <Field label="Your name" hint="Printed with your letter.">
          <input name="name" required autoComplete="name" className={inputClass} />
        </Field>

        <Field label="Town or city" hint="Optional. Printed with your name.">
          <input name="location" autoComplete="address-level2" className={inputClass} />
        </Field>
      </div>

      <Field
        label="Email address"
        hint="Required so we can verify the letter and reply. Never printed, never added to any list."
      >
        <input name="email" type="email" required autoComplete="email" className={inputClass} />
      </Field>

      <Field label="Subject" hint="Optional.">
        <input name="subject" className={inputClass} />
      </Field>

      <Field
        label="Your letter"
        hint={`${body.length.toLocaleString()} of ${MAX_BODY.toLocaleString()} characters. Shorter letters are likelier to run in full.`}
      >
        <textarea
          name="body"
          required
          rows={10}
          maxLength={MAX_BODY}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={inputClass}
        />
      </Field>

      <div className="mt-4 flex justify-center">
        <CaptchaWidget onToken={onToken} action="letter_submit" />
      </div>

      {state === "error" && (
        <p role="alert" className="mt-4 rounded-lg bg-brand/10 px-4 py-3 text-sm text-brand">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={state === "sending"}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
      >
        {state === "sending" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Send to the editors
      </button>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        We read every letter. We publish a selection, may edit for length and
        clarity, and will contact you before printing yours. Your address is
        kept private &mdash; see our{" "}
        <a href="/privacy" className="underline">
          privacy notice
        </a>
        .
      </p>
    </form>
  );
}

const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-4 block first:mt-0">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs leading-relaxed text-muted">{hint}</span>}
    </label>
  );
}
