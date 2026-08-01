"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Email + password sign in. Supabase sets the session cookie in the browser,
 * then we refresh so the server components re-render as the signed-in editor.
 * Accounts are created by an admin in Supabase — there is no public sign-up.
 */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "signing-in" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase) {
      setStatus("error");
      setMessage("Supabase is not configured for this deployment.");
      return;
    }

    setStatus("signing-in");
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setStatus("error");
      setMessage(
        error.message === "Invalid login credentials"
          ? "That email and password don't match an account."
          : error.message
      );
      return;
    }

    router.replace(next);
    router.refresh();
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

      <div>
        <label htmlFor="password" className="block text-sm font-semibold">
          Password
        </label>
        <div className="relative mt-2">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 pr-11 text-sm outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {status === "error" && (
        <p role="alert" className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "signing-in"}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {status === "signing-in" && (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        {status === "signing-in" ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
