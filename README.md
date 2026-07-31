# Northeastern Journal

A modern, production-ready rebuild of Northeastern Journal — a family
platform for civic writing and generational perspectives. Built with
Next.js App Router, TypeScript, and Tailwind CSS.

This is a redesign and rebrand: all article, author, and page content in
this repository is original placeholder copy generated for the rebuild,
not a migration of existing published material.

## Stack

- Next.js (App Router, Server Components)
- TypeScript
- Tailwind CSS v4
- Framer Motion, Lucide Icons
- next-themes (light/dark mode)

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Copy `.env.example` to `.env.local` if you want to connect Resend, a
captcha provider, or persistent storage — none of it is required to run
the site locally.

## Architecture

- `src/app/(site)` — the public site: one folder per section (about,
  authors, author/[slug], cherokee-nana, next-generation, conversations,
  category/[slug], article/[category]/[slug], books, videos, newsletter,
  unsubscribe, search).
- `src/app/(admin)` — the dashboard at `/admin`, with its own shell
  instead of the public masthead and footer.
- `src/app/api` — the newsletter one-click unsubscribe endpoint and the
  dashboard photo upload.
- SEO metadata routes (`sitemap.ts`, `robots.ts`, `manifest.ts`) and the
  feeds (`rss.xml`, `atom.xml`) sit at the app root.
- `src/components` — layout (header/footer), article cards, shared UI
  (newsletter signup, social links, author photo/cards, breadcrumbs), and
  `admin/` form components.
- `src/lib/content` — the CMS-ready data boundary. `types.ts` defines
  content models (Article, Author, Book, Video, Conversation,
  NewsletterIssue, Category); `data.ts` holds the placeholder dataset;
  `api.ts` is the only module pages import from. Swapping in a real CMS
  (WordPress, Sanity, Strapi, Contentful, Payload) means reimplementing
  `api.ts` against the same types — no page or component changes
  required.
- `src/lib/store` — the pluggable key/value store behind profile edits,
  subscribers, and rate limits (see *Storage* below).
- `src/lib/auth`, `src/lib/security`, `src/lib/email`,
  `src/lib/newsletter`, `src/lib/authors` — dashboard sessions and
  accounts; captcha, rate limiting, email validation and signed tokens;
  the Resend transport and templates; the signup/unsubscribe flow; and
  author profile parsing, stats, and save actions.
- `src/proxy.ts` — verifies the dashboard session at the edge before any
  `/admin` route renders.
- `src/lib/jsonld.ts` — JSON-LD builders for Organization, WebSite,
  BreadcrumbList, Person, BlogPosting, CollectionPage, FAQPage,
  VideoObject, and Book structured data.
- `src/lib/site-config.ts` — site name, nav, footer links, and the
  publisher identity used in newsletter footers.

## Author profiles

Every contributor has an editorial profile page at `/author/<slug>`: a
full-bleed hero with their portrait, title, location, featured quote and
social icons; an at-a-glance stat strip; "About the Author"; their beats;
featured, recent, and most-read work; an "Elsewhere" section grouping
syndicated columns, outside bylines, awards, press appearances and
portfolio links; a coverage-mix breakdown; and the full archive.
`/authors` is the contributor index.

### Editing a profile

Sign in at `/admin` and open **Edit Profile**. Photo (upload or link),
name, job title, location, contact email, website, short bio, full
biography, featured quote, all seven social links, outside work, and
beats are editable there. Saving writes to the profile store and
revalidates the public pages in the same request — no code change, no
redeploy.

### Accounts and passwords

**Account & Password** in the dashboard is where you change your own
password (current password required), display name, and sign-in email.
Owners additionally get an editor roster there: add someone, change their
role or linked author profile, reset a forgotten password, or remove
access — all without touching an environment variable.

Two safeguards make it hard to lock the newsroom out: the last remaining
owner can't be deleted or demoted, and you can't delete the account
you're signed in with.

`NJ_ADMIN_ACCOUNTS` is the **seed**, not the permanent home. It gets the
first owner in; every change made from the dashboard is written to the
store and merged over the seed on read. A removed seeded account stays
removed (it's tombstoned), and a dashboard password change supersedes the
seeded hash.

> Because account changes live in the store, run a persistent driver in
> production. On the `memory` driver they'd be lost on restart — the
> Account page warns you when that's the case.

The seed format:

```jsonc
[
  {
    "email": "nana@northeasternjournal.com",
    "name": "Cherokee Nana",
    "authorSlug": "cherokee-nana",   // profile this account owns
    "role": "owner",                 // "owner" edits anyone; "author" edits self
    "passwordHash": "pbkdf2:210000:...:..."
  }
]
```

Generate a hash with `npm run hash-password -- 'the password'`. With the
variable unset, a development-only account
(`editor@northeasternjournal.com` / `northeastern`) is available outside
production so the dashboard is usable immediately.

Note that `.env.local` is gitignored, so it does not travel with the
repository. A fresh clone or a new deployment needs its own copy, or
sign-in will fail with "That email and password don't match an account".

The seed roster in `src/lib/content/data.ts` still defines *who* the
authors are; dashboard edits are stored as overrides and merged on read,
so deleting an override restores the seeded profile.

## Newsletter

Signup is single opt-in: a reader submits their address and is
subscribed immediately, with a welcome email sent through Resend. There
is no confirmation link to click. Abuse is handled at submission time
instead:

1. a hidden honeypot field,
2. rate limiting (5 signups per IP per 10 minutes, 3 per address per hour),
3. captcha verification — Cloudflare Turnstile or reCAPTCHA v3, whichever
   has keys configured,
4. validation: syntax, length, and disposable-domain screening, plus an
   optional MX lookup (`NJ_VERIFY_MX=true`),
5. duplicate detection, so an existing subscriber is never double-added.

Unsubscribing stays CAN-SPAM compliant: every email carries the
publisher's legal name and physical postal address, a plain statement of
why the reader is receiving it, and a no-login opt-out link that works
forever (the token is a stable HMAC of the address). `List-Unsubscribe`
and `List-Unsubscribe-Post` headers enable RFC 8058 one-click opt-out,
handled at `/api/newsletter/unsubscribe`. Opt-outs take effect
immediately and free of charge.

Without `RESEND_API_KEY`, signups still work and welcome emails are
logged rather than sent — useful for local development.

## Storage

Profile edits, subscribers, and rate-limit counters go through
`src/lib/store/driver.ts`, which picks a backend automatically:

| Driver | When it's used | Persistence |
| --- | --- | --- |
| `redis-rest` | `KV_REST_API_URL` + `KV_REST_API_TOKEN` (or the `UPSTASH_REDIS_REST_*` pair) are set | Survives deploys — use this in production |
| `file` | Default | JSON under `.data/`; fine locally and on a long-lived Node server |
| `memory` | Automatic fallback when the filesystem is read-only | Process lifetime only |

No SDK is required — the KV driver talks to Upstash over `fetch`. Force
a driver with `NJ_STORE_DRIVER`. The dashboard shows which one is active.

## SEO

Dynamic per-page metadata, Open Graph/Twitter cards, canonical URLs,
JSON-LD structured data (including a rich `Person` graph for each
author), an XML sitemap (including article images), robots.txt, and
RSS/Atom feeds are all wired up out of the box. `/admin`, `/unsubscribe`,
and `/api` are excluded from indexing.
