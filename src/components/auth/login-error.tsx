import { AlertTriangle } from "lucide-react";

/**
 * Explains why a sign-in link didn't work.
 *
 * Without this the callback's `?error=` was dropped on the floor and a
 * failed link looked identical to arriving at the sign-in page normally —
 * which is exactly how a broken link gets reported as "it just takes you
 * to the sign in page".
 */
export function LoginError({ error }: { error: string }) {
  const { title, detail } = explain(error);

  return (
    <div
      role="alert"
      className="mb-6 flex items-start gap-3 rounded-xl border border-brand/30 bg-brand/10 px-4 py-3.5"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
      <div className="text-sm">
        <p className="font-semibold text-brand">{title}</p>
        <p className="mt-1 leading-relaxed text-foreground/80">{detail}</p>
      </div>
    </div>
  );
}

function explain(error: string): { title: string; detail: string } {
  const raw = error.toLowerCase();

  if (raw === "missing-code") {
    return {
      title: "That link was incomplete",
      detail:
        "The sign-in link didn't carry its one-time token. This usually means the link was copied by hand or reformatted by an email client. Request a new one below and click it directly from the email.",
    };
  }

  if (raw === "not-configured") {
    return {
      title: "Sign-in isn't configured",
      detail:
        "This deployment is missing its Supabase credentials, so no one can sign in. An administrator needs to set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }

  if (raw.includes("expired") || raw.includes("invalid") || raw.includes("already")) {
    return {
      title: "That link has expired or was already used",
      detail:
        "Sign-in links work once and last one hour. Some corporate mail filters open links automatically to scan them, which uses the link up before you click it. Request a fresh one below.",
    };
  }

  if (raw.includes("verifier") || raw.includes("pkce") || raw.includes("code challenge")) {
    return {
      title: "Open the link in the same browser that requested it",
      detail:
        "This link is tied to the browser where you asked for it. Request a new link here and open it in this browser, on this device.",
    };
  }

  return {
    title: "That sign-in link didn't work",
    detail: `${error}. Request a new link below — if it keeps failing, the redirect URL may not be allow-listed in the Supabase project's Authentication → URL Configuration.`,
  };
}
