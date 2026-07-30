import Link from "next/link";

/**
 * Rendered instead of the dashboard when Supabase credentials are missing, so
 * a fresh clone or a misconfigured deploy explains itself rather than throwing.
 */
export function SetupNotice() {
  return (
    <div className="content-container flex min-h-[70vh] items-center py-16">
      <div className="mx-auto max-w-xl">
        <p className="kicker">Newsroom</p>
        <h1 className="mt-2 font-serif text-3xl font-bold">Finish connecting Supabase</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          The dashboard needs a Supabase project before it can load. Add these
          to your environment (a <code>.env.local</code> file locally, or
          Project Settings → Environment Variables on Vercel):
        </p>

        <pre className="mt-5 overflow-x-auto rounded-xl border border-border bg-surface p-4 text-xs leading-relaxed">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...`}
        </pre>

        <p className="mt-5 text-sm leading-relaxed text-muted">
          Full walkthrough — creating the project, running the SQL, enabling
          email sign-in, and deploying — is in{" "}
          <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">docs/SETUP.md</code>.
        </p>

        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground"
        >
          Back to the Journal
        </Link>
      </div>
    </div>
  );
}
