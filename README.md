# Northeastern Journal

Independent news for northeastern Oklahoma. A Next.js newspaper with a
built-in newsroom CMS — two editors can write, schedule, publish, and email
subscribers without touching code or waiting on a deploy.

Founded and run by Cheryl Leeds and Luke Johnson. The masthead is open:
contributors are added from the dashboard, with their own byline and archive.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions)
- **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Supabase** — Postgres, Auth, Storage, Row Level Security
- **Resend** — newsletter and article announcements
- **TipTap** — rich text editing
- **Vercel** — hosting and cron

No Firebase.

## Getting started

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

The site runs **without any configuration** — Supabase and Resend are optional
at boot. With no credentials it serves the built-in placeholder archive, and
`/admin` shows setup instructions instead of crashing. That's deliberate: a
missing environment variable should never take the newspaper offline.

To connect the real backend, follow **[docs/SETUP.md](docs/SETUP.md)** — a
step-by-step walkthrough of Supabase, Resend, and Vercel written for someone
who has configured none of them before.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server on :3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## How it fits together

### Content flows through one boundary

Every page reads through `src/lib/content/api.ts`. That module merges two
sources and hands back plain domain objects:

1. **Supabase** — everything editors publish (`isDemo: false`)
2. **`src/lib/content/data.ts`** — the shipped placeholder archive (`isDemo: true`)

`resolveContent` then drops placeholders from any listing that already has a
real article. So the site looks complete on day one, and each story published
quietly retires showcase content — no flag to flip, no code change. Once the
archive is populated the placeholders are gone entirely.

Pages never import a data source directly, so swapping or extending the backend
touches one file.

### Security lives in the database

Row Level Security policies in `supabase/migrations/0001_initial_schema.sql`
decide who can read and write what. The TypeScript helpers in
`src/lib/auth/roles.ts` are convenience — they make the UI sensible, but a bug
there cannot leak or corrupt data, because Postgres refuses the query.

| Role | Can do |
|---|---|
| **Admin** | Everything, plus team, settings, subscribers |
| **Editor** | Write and edit any article, publish, schedule, announce |
| **Contributor** | Write and edit their own drafts; cannot publish |
| **Reader** | Signed in, no newsroom access |

Publishing is additionally gated by a database trigger, so a contributor can't
publish by calling the API directly.

The two founding accounts are seeded as administrators. Everyone else defaults
to `reader` until an admin invites them from `/admin/team`.

### Subscriber data is private by construction

`subscribers` has no `anon` policy at all — the public role cannot read it,
write it, or count it. Signup, confirmation, and unsubscribe run through
server routes using the service-role key. There is no code path that can leak
the list to a browser.

## Layout

```
src/
  app/
    admin/              Newsroom dashboard (force-dynamic, gated)
      actions.ts        All CMS server actions — save, publish, schedule, invite
    api/
      newsletter/       Double opt-in: subscribe, confirm, unsubscribe
      cron/             Scheduled publishing (Vercel Cron)
    article/[category]/[slug]/
    auth/               Magic-link callback and sign-out
    login/
  components/
    admin/              Editor, rich text, uploader, nav
    article/            Cards and share buttons
    layout/             Header and footer
    shared/             Newsletter signup, breadcrumbs, section headers
  lib/
    auth/roles.ts       Role model and route gates (server-only)
    content/            Domain types, Supabase source, placeholder data, api
    email/              Resend client, HTML templates, send logic
    supabase/           Browser / server / service-role clients, DB types
    richtext.ts         HTML sanitizer, markdown, reading time, slugify
  proxy.ts              Session refresh + /admin gate
supabase/migrations/    Schema, RLS, triggers, seed data
docs/SETUP.md           Full deployment walkthrough
```

## Publishing an article

1. `/admin` → **Write an article**
2. Type the headline — the URL slug fills itself in
3. Write the body (rich text, or switch to Markdown)
4. Upload a featured image, add alt text
5. Pick a category, author, tags
6. Optionally tick **Notify subscribers**
7. **Publish**

Under a minute. Drafts, scheduling, and unpublishing are all one click from the
same screen.

## Editorial safeguards

- **Body HTML is sanitized on save** against a strict allowlist
  (`sanitizeArticleHtml`). Signed-in authors are trusted people, but a
  compromised account should not be able to inject script into every reader's
  browser.
- **Announcements can't double-send.** `articles.notified_at` is stamped before
  the send and cleared only if nothing actually went out.
- **Slugs are uniqued automatically** rather than failing on collision.
- **Deletes ask first**, and only editors and admins can delete published work.

## SEO and performance

Per-page metadata, Open Graph and Twitter cards, canonical URLs, and JSON-LD
(`NewsMediaOrganization`, `NewsArticle`, `BreadcrumbList`, `Person`,
`CollectionPage`, `FAQPage`, `VideoObject`, `Book`) ship out of the box, along
with an image sitemap, `robots.txt`, and RSS/Atom feeds.

Article pages are statically generated and revalidated on publish via cache
tags, so readers get static-file performance and editors get instant updates.
Images are served as AVIF/WebP through `next/image` with a 30-day cache.

## A note on scheduled publishing

`vercel.json` runs the publish job once daily, because **the Vercel Hobby plan
fails any deployment whose cron is more frequent than that**. On Pro, change
the schedule to `*/5 * * * *`. Manual publishing is instant either way — cron
only matters for articles scheduled ahead of time. See
[docs/SETUP.md](docs/SETUP.md#14-turn-on-scheduled-publishing).

## Roadmap

The schema and the content boundary were designed with these in mind. Each is
additive:

| Feature | What it needs |
|---|---|
| Multiple writers | **Already works** — invite from `/admin/team` |
| Contributor profiles | **Already works** — `authors` rows, `/author/[slug]` |
| Editorial approval workflow | A `pending_review` value on `article_status`, plus a queue view |
| Search | Swap the in-memory filter for the `articles_search_idx` GIN index |
| RSS / feeds | **Already works** — `/rss.xml`, `/atom.xml` |
| Saved articles | A `saved_articles` table keyed on `profiles.id` |
| Events calendar | An `events` table plus a fetch in `api.ts` |
| Podcast support | An `episodes` table; the `videos` pattern is the template |
| Community announcements | A `category`, or a small `announcements` table |
| Analytics dashboard | `articles.view_count` exists; add an increment and a chart |
| Advertiser dashboard | A new role in `user_role` plus its own route group |
| Push notifications | Web Push subscriptions alongside `subscribers` |
| Mobile app | The Supabase schema is already the API |

## Placeholder content

Article, author, book, video, and conversation copy in
`src/lib/content/data.ts` is original placeholder text written for the rebuild,
not a migration of published material. It exists so the site never looks empty
and retires itself as real reporting is published.
