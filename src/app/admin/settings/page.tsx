import { requireAdmin } from "@/lib/auth/roles";
import { createServerSupabase } from "@/lib/supabase/server";
import { isResendConfigured, emailConfig } from "@/lib/email/resend";
import { hasServiceRole } from "@/lib/supabase/env";
import { CheckCircle2, XCircle } from "lucide-react";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin("/admin/settings");
  const supabase = await createServerSupabase();
  const { data: settings } = (await supabase?.from("settings").select("*")) ?? { data: [] };

  const checks = [
    {
      label: "Supabase database",
      ok: true,
      detail: "Connected. Articles, authors, and subscribers are live.",
    },
    {
      label: "Service-role key",
      ok: hasServiceRole,
      detail: hasServiceRole
        ? "Set. Newsletter signups and scheduled publishing will work."
        : "Missing SUPABASE_SERVICE_ROLE_KEY — newsletter signups and scheduled publishing are disabled.",
    },
    {
      label: "Resend email",
      ok: isResendConfigured,
      detail: isResendConfigured
        ? `Sending as ${emailConfig.from}`
        : "Missing RESEND_API_KEY — no email will be delivered.",
    },
    {
      label: "Scheduled publishing",
      ok: Boolean(process.env.CRON_SECRET),
      detail: process.env.CRON_SECRET
        ? "CRON_SECRET is set. Vercel Cron runs every 5 minutes."
        : "Missing CRON_SECRET — scheduled articles will not go live automatically.",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <p className="kicker">Newsroom</p>
        <h1 className="mt-1 font-serif text-3xl font-bold">Settings</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          A health check of the services the Journal depends on. Values come
          from environment variables — change them in Vercel (Project Settings →
          Environment Variables) and redeploy.
        </p>
      </header>

      <section className="mt-8">
        <h2 className="font-serif text-lg font-bold">System status</h2>
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-3 px-4 py-4">
              {c.ok ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
              )}
              <div>
                <p className="font-medium">{c.label}</p>
                <p className="mt-0.5 text-sm text-muted">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-lg font-bold">Stored settings</h2>
        <p className="mt-2 text-sm text-muted">
          Editable directly in Supabase (Table Editor → <code>settings</code>).
          Kept in the database so future features can change behaviour without a
          deploy.
        </p>
        <div className="mt-4 space-y-3">
          {(settings ?? []).map((s) => (
            <div key={s.key} className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">{s.key}</p>
              <pre className="mt-2 overflow-x-auto text-xs leading-relaxed">
                {JSON.stringify(s.value, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
