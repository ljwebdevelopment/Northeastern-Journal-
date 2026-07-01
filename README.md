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

## Architecture

- `src/app` — routes, one folder per section (about, cherokee-nana,
  next-generation, conversations, category/[slug], author/[slug],
  article/[category]/[slug], books, videos, newsletter, search), plus
  SEO metadata routes (`sitemap.ts`, `robots.ts`, `manifest.ts`,
  `rss.xml`, `atom.xml`).
- `src/components` — layout (header/footer), article cards, and shared
  UI (newsletter signup, breadcrumbs, author/book/video/conversation
  cards).
- `src/lib/content` — the CMS-ready data boundary. `types.ts` defines
  content models (Article, Author, Book, Video, Conversation,
  NewsletterIssue, Category); `data.ts` holds the placeholder dataset;
  `api.ts` is the only module pages import from. Swapping in a real CMS
  (WordPress, Sanity, Strapi, Contentful, Payload) means reimplementing
  `api.ts` against the same types — no page or component changes
  required.
- `src/lib/jsonld.ts` — JSON-LD builders for Organization, WebSite,
  BreadcrumbList, Person, BlogPosting, CollectionPage, FAQPage,
  VideoObject, and Book structured data.
- `src/lib/site-config.ts` — site name, nav, and footer link config.

## SEO

Dynamic per-page metadata, Open Graph/Twitter cards, canonical URLs,
JSON-LD structured data, an XML sitemap (including article images),
robots.txt, and RSS/Atom feeds are all wired up out of the box.
