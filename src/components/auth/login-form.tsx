"use client";

import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Magic-link sign in. No passwords are ever collected or stored — Supabase
 * emails a one-time link, and the /auth/callback route exchanges it for a
 * session cookie.
 */
export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase) {
      setStatus("error");
      setMessage("Supabase is not configured for this deployment.");
      return;
    }

    setStatus("sending");
    setMessage("");

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="text-center">
        <MailCheck className="mx-auto h-10 w-10 text-brand" aria-hidden="true" />
        <h2 className="mt-4 font-serif text-xl font-bold">Check your email</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          We sent a sign-in link to <strong className="text-foreground">{email}</strong>.
          It expires in one hour and works once. Open it in this browser —
          links opened on a different device can&apos;t complete sign-in.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-5 text-sm font-semibold text-accent hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-semibold">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-2 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand"
        />
      </div>

      {status === "error" && (
        <p role="alert" className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {status === "sending" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {status === "sending" ? "Sending link…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
