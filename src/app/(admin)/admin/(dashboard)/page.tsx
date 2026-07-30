import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MailCheck, ShieldCheck, ShieldAlert, UserCog } from "lucide-react";
import { getCurrentAccount } from "@/lib/auth/session";
import { getArticlesByAuthor, getAuthors, getCategories } from "@/lib/content/api";
import { buildAuthorStats } from "@/lib/authors/stats";
import { subscriberStats } from "@/lib/store/subscribers";
import { captchaProvider } from "@/lib/security/captcha";
import { emailConfigured } from "@/lib/email/resend";
import { activeStoreDriver } from "@/lib/store/driver";
import { AuthorPhoto } from "@/components/shared/author-photo";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 font-serif text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function StatusRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  const Icon = ok ? ShieldCheck : ShieldAlert;
  return (
    <li className="flex items-start gap-3 py-3">
      <Icon className={ok ? "mt-0.5 h-4 w-4 text-brand" : "mt-0.5 h-4 w-4 text-muted"} aria-hidden />
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted">{detail}</p>
      </div>
    </li>
  );
}

export default async function AdminOverviewPage() {
  const account = await getCurrentAccount();
  if (!account) return null;

  const [authors, categories, subscribers] = await Promise.all([
    getAuthors(),
    getCategories(),
    subscriberStats(),
  ]);

  const author = authors.find((a) => a.slug === account.authorSlug);
  const articles = author ? await getArticlesByAuthor(author.slug) : [];
  const stats = author ? buildAuthorStats(author, articles, categories) : null;

  const captcha = captchaProvider();
  const driver = activeStoreDriver();

  return (
    <div className="space-y-8">
      <header>
        <p className="kicker">Dashboard</p>
        <h1 className="mt-1.5 font-serif text-3xl font-bold">
          Welcome back, {account.name.split(" ")[0]}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Manage your public author profile and keep an eye on the Sunday Letter.
        </p>
      </header>

      {author && stats && (
        <section className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-muted">
              <AuthorPhoto src={author.photo} alt={`Portrait of ${author.name}`} sizes="80px" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="kicker">{author.role}</p>
              <h2 className="mt-1 font-serif text-xl font-bold">{author.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{author.bio}</p>
            </div>
            <Link
              href="/admin/profile"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
            >
              <UserCog className="h-4 w-4" aria-hidden /> Edit profile
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Articles published" value={stats.totalArticles} />
            <Stat label="Categories" value={stats.categoryCount} />
            <Stat label="Outside bylines" value={stats.externalWorkCount} />
            <Stat
              label="Latest byline"
              value={stats.lastPublishedAt ? formatDate(stats.lastPublishedAt) : "—"}
            />
          </div>

          {author.updatedAt && (
            <p className="mt-4 text-xs text-muted">
              Profile last updated {new Date(author.updatedAt).toLocaleString("en-US")}.
            </p>
          )}
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-xl font-bold">The Sunday Letter</h2>
            <Link
              href="/admin/subscribers"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
            >
              Subscribers <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <Stat label="Active" value={subscribers.active} />
            <Stat label="New (30 days)" value={subscribers.last30Days} />
            <Stat label="Unsubscribed" value={subscribers.unsubscribed} />
            <Stat label="Total records" value={subscribers.total} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-serif text-xl font-bold">Signup protection</h2>
          <p className="mt-1.5 text-sm text-muted">
            Readers are subscribed on submit — no confirmation email. These
            guards keep the list clean.
          </p>
          <ul className="mt-4 divide-y divide-border">
            <StatusRow
              ok={captcha !== "none"}
              label={
                captcha === "turnstile"
                  ? "Cloudflare Turnstile active"
                  : captcha === "recaptcha"
                    ? "reCAPTCHA v3 active"
                    : "No captcha configured"
              }
              detail={
                captcha === "none"
                  ? "Set TURNSTILE_SECRET_KEY + NEXT_PUBLIC_TURNSTILE_SITE_KEY (or the reCAPTCHA pair)."
                  : "Every signup is verified before it reaches the list."
              }
            />
            <StatusRow
              ok
              label="Rate limiting active"
              detail="5 signups per IP per 10 minutes, 3 per address per hour."
            />
            <StatusRow
              ok
              label="Validation & duplicate detection"
              detail="Syntax and disposable-domain checks; repeat addresses are never double-added."
            />
            <StatusRow
              ok={emailConfigured()}
              label={emailConfigured() ? "Resend connected" : "Resend not configured"}
              detail={
                emailConfigured()
                  ? "Welcome emails send on signup with a one-click unsubscribe header."
                  : "Set RESEND_API_KEY to send welcome emails. Signups still work without it."
              }
            />
            <StatusRow
              ok={driver !== "memory"}
              label={
                driver === "redis-rest"
                  ? "Persistent storage connected"
                  : driver === "file"
                    ? "Local file storage"
                    : "In-memory storage"
              }
              detail={
                driver === "memory"
                  ? "Profiles and subscribers reset on restart. Configure KV_REST_API_URL to persist."
                  : "Profile edits and subscribers survive restarts."
              }
            />
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2.5">
          <MailCheck className="h-4 w-4 text-brand" aria-hidden />
          <h2 className="font-serif text-xl font-bold">Compliance</h2>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Every issue carries the Journal&rsquo;s legal name and postal address,
          a one-click unsubscribe link, and RFC 8058 List-Unsubscribe headers.
          Opt-outs are honored immediately and free of charge, as CAN-SPAM
          requires. Update the address with{" "}
          <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs">
            NEWSLETTER_POSTAL_ADDRESS
          </code>
          .
        </p>
      </section>
    </div>
  );
}
