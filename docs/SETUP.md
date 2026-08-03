# Setup & Deployment

Everything needed to take this repository from a fresh clone to a live
newspaper at `northeasternjournal.com`, written for someone who has never
configured Supabase, Resend, or Vercel before.

Work through it in order. Nothing here is optional except where marked.

**Time required:** about 45–60 minutes the first time.

**What you'll need:**

- A GitHub account with this repository pushed to it
- A credit card is *not* required — the free tier of all three services covers
  a newspaper this size comfortably
- Access to your domain's DNS settings (for email + custom domain)

---

## Table of contents

1. [Create the Supabase project](#1-create-the-supabase-project)
2. [Create the database tables](#2-create-the-database-tables)
3. [Turn on email sign-in](#3-turn-on-email-sign-in)
4. [Check Row Level Security](#4-check-row-level-security)
5. [Check the storage bucket](#5-check-the-storage-bucket)
6. [Collect your Supabase keys](#6-collect-your-supabase-keys)
7. [Set up Resend](#7-set-up-resend)
8. [Verify your sending domain](#8-verify-your-sending-domain)
9. [Run it locally](#9-run-it-locally)
10. [Deploy to Vercel](#10-deploy-to-vercel)
11. [Add production environment variables](#11-add-production-environment-variables)
12. [Point your domain at Vercel](#12-point-your-domain-at-vercel)
13. [Finish the Supabase redirect URLs](#13-finish-the-supabase-redirect-urls)
14. [Turn on scheduled publishing](#14-turn-on-scheduled-publishing)
15. [Test production](#15-test-production)
16. [Day-to-day: publishing an article](#16-day-to-day-publishing-an-article)
17. [Troubleshooting](#troubleshooting)

---

## 1. Create the Supabase project

Supabase is the database. It stores articles, authors, subscribers, and who is
allowed to sign in.

1. Go to <https://supabase.com> and click **Start your project**. Sign in with
   GitHub.
2. Click **New project**.
3. Fill in:
   - **Name:** `northeastern-journal`
   - **Database Password:** click **Generate a password**, then **copy it into
     your password manager**. You will rarely need it, but it cannot be
     recovered later — only reset.
   - **Region:** pick the one closest to Oklahoma. `us-east-1` or `us-west-1`
     are both fine.
   - **Pricing plan:** Free.
4. Click **Create new project** and wait ~2 minutes while it provisions.

---

## 2. Create the database tables

This is the step that creates every table, security rule, and trigger.

Run **every file in `supabase/migrations/`, in numerical order**. Today that is:

| File | What it does |
|---|---|
| `0001_initial_schema.sql` | Tables, RLS policies, triggers, storage bucket, grants |
| `0002_seed_reference_data.sql` | Sections, founding bylines, default settings |
| `0003_harden_profile_privileges.sql` | Blocks self-promotion to admin |
| `0004_grant_table_privileges.sql` | Grants API roles access to the tables |
| `0005_article_views.sql` | Lets anonymous readers count one view per article |
| `0006_single_opt_in.sql` | Single opt-in newsletter + durable rate-limit counters |
| `0007_author_profiles.sql` | Extended contributor profile fields |
| `0008_author_subscriptions.sql` | Per-journalist follower subscriptions |
| `0009_article_engagement.sql` | Article likes and reader comments |
| `0010_newsletter_issues.sql` | Weekly newsletter issues and their archive |

For each one:

1. In the Supabase dashboard, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Copy the **entire** contents of the file.
4. Paste it into the SQL Editor and click **Run** (or press Ctrl+Enter).
5. You should see `Success. No rows returned`. That is what success looks
   like — it created things rather than fetching them.

> **0003 and 0004 are already included in 0001 for a fresh project.** They
> exist separately so a database created before those fixes can be patched
> without a rebuild. Running them anyway is harmless — every statement is
> idempotent. If you're setting up for the first time, run all four and don't
> think about it.

**What just happened:** you created tables for articles, authors, categories,
tags, subscribers, media, and settings; enabled Row Level Security on all of
them; seeded the section list; and put
`lljohnson1201@gmail.com` and `caleeds77@gmail.com` on the administrator
allowlist.

> **Verify it worked:** click **Table Editor** in the sidebar. You should see
> `articles`, `authors`, `categories`, `subscribers`, and others. Open
> `admin_allowlist` — it should contain exactly two rows, both with role
> `admin`.

---

## 3. Turn on email + password sign-in

Editors sign in with an email address and a password. There is no public
sign-up — an admin creates each account in Supabase.

1. Go to **Authentication → Sign In / Providers** in the sidebar.
2. Confirm **Email** is enabled, with **Enable email provider** ON.
3. Leave **Secure email change** on.
4. To add an editor: **Authentication → Users → Add user → Create new user**.
   Enter their email and a password, and tick **Auto Confirm User** so they can
   sign in immediately.
5. Their email must also exist in `admin_allowlist` with the right role, or the
   account signs in as a `reader` with no newsroom access. The two founding
   admins are seeded by the migration; add anyone else from **/admin/team**.
6. Under **Authentication → URL Configuration**:
   - **Site URL:** `http://localhost:3000` for now. You'll change this in
     step 13.
   - **Redirect URLs:** click **Add URL** and add:
     ```
     http://localhost:3000/auth/callback
     ```
   This is used by password-recovery and invite emails, not by normal sign-in.

> **Forgot a password?** Reset it from **Authentication → Users** — open the
> user's row menu and choose **Send password recovery** (or set a new password
> directly). There is no self-serve reset link on the sign-in page.

---

## 4. Check Row Level Security

Row Level Security (RLS) is what makes the database safe to expose to the
public internet. Every table has rules deciding who may read or change each
row. Step 2 already configured them; this step is verification.

1. Go to **Authentication → Policies**.
2. You should see policies listed for `articles`, `authors`, `categories`,
   `profiles`, `subscribers`, and the rest.
3. Confirm each table shows **RLS enabled** (a green badge), not "RLS
   disabled".

**What the rules do:**

| Table | Public (not signed in) | Contributor | Editor | Admin |
|---|---|---|---|---|
| `articles` | Read published only | Write + edit own drafts | Everything | Everything |
| `authors` | Read | Edit own byline | Everything | Everything |
| `categories`, `tags` | Read | Add tags | Everything | Everything |
| `subscribers` | **No access at all** | No access | Read | Everything |
| `admin_allowlist` | No access | No access | No access | Everything |

Publishing is additionally blocked at the database level by a trigger, so a
contributor cannot publish even by calling the API directly.

---

## 5. Check the storage bucket

Uploaded images live in Supabase Storage. Step 2 created the bucket.

1. Go to **Storage** in the sidebar.
2. You should see a bucket named **media**, marked **Public**.
3. If it is missing, run this in the SQL Editor:

   ```sql
   insert into storage.buckets (id, name, public, file_size_limit)
   values ('media', 'media', true, 10485760)
   on conflict (id) do update set public = true;
   ```

Public means *readable* by anyone with the URL — which is what you want for
article photos. Uploading still requires a signed-in newsroom account.

---

## 6. Collect your Supabase keys

1. Go to **Project Settings** (gear icon) → **API keys**.
2. You need three values. Keep this tab open.

| Where it says | Copy into |
|---|---|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon** / **public** key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role** key (click *Reveal*) | `SUPABASE_SERVICE_ROLE_KEY` |

> **The service_role key bypasses every security rule.** Treat it like the
> keys to the building. Never paste it into a client-side file, a screenshot,
> or a chat message. If it ever leaks, click **Reset** on that key in Supabase
> and update your environment variables.

---

## 7. Set up Resend

Resend delivers the newsletter and article announcements.

1. Go to <https://resend.com> and sign up.
2. In the dashboard, click **API Keys → Create API Key**.
   - **Name:** `northeastern-journal-production`
   - **Permission:** `Sending access`
   - **Domain:** `All domains` for now
3. Click **Add** and **copy the key immediately** — Resend shows it once.
   This is `RESEND_API_KEY`.

At this point you can send email only to the address you signed up with. The
next step lifts that limit.

---

## 8. Verify your sending domain

Until your domain is verified, Resend will not deliver to your readers. This
step requires DNS access.

1. In Resend, go to **Domains → Add Domain**.
2. Enter `northeasternjournal.com` and pick the region closest to you.
3. Resend shows several DNS records — typically an `MX` record and two or three
   `TXT` records (DKIM, SPF, and optionally DMARC).
4. Go to wherever your domain's DNS lives (the registrar you bought it from,
   or Cloudflare, or Vercel if the domain is managed there) and add each
   record **exactly** as shown.
   - The **Name/Host** field: some registrars want the full
     `send.northeasternjournal.com`, others want just `send`. If your
     registrar automatically appends the domain, use the short form.
   - Set TTL to `Auto` or `3600`.
   - If you use Cloudflare, set the proxy status to **DNS only** (grey cloud),
     not proxied.
5. Back in Resend, click **Verify DNS Records**.
6. Verification usually completes in a few minutes but can take up to 48 hours.
   Resend emails you when it's done.

Once verified, set `NEWSLETTER_FROM` to an address on that domain, for example
`Northeastern Journal <newsletter@northeasternjournal.com>`.

> **Why this matters:** DKIM and SPF prove the email genuinely came from you.
> Without them, Gmail and Outlook route your newsletter straight to spam.

---

## 9. Run it locally

Confirm everything works on your own machine before deploying.

```bash
npm install
```

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the five values you collected:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
RESEND_API_KEY=re_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
CRON_SECRET=<paste output of: openssl rand -hex 32>
```

Then start the dev server:

```bash
npm run dev
```

Open <http://localhost:3000>. The public site should look exactly as it does
today, still showing the placeholder archive.

Now test the newsroom:

1. Go to <http://localhost:3000/login>.
2. Enter `lljohnson1201@gmail.com` (or `caleeds77@gmail.com`).
3. Check that inbox for a "Confirm your signup" email from Supabase and click
   the link.
4. You should land on `/admin` and see the dashboard.

If you land on "You're signed in, but not on the masthead", the allowlist
didn't apply — see [Troubleshooting](#troubleshooting).

---

## 10. Deploy to Vercel

1. Push this repository to GitHub if you haven't:

   ```bash
   git add -A && git commit -m "Newsroom CMS" && git push
   ```

2. Go to <https://vercel.com> and sign in with GitHub.
3. Click **Add New → Project**.
4. Find `northeastern-journal` in the list and click **Import**.
5. Vercel detects Next.js automatically. Leave the build settings alone:
   - Framework Preset: **Next.js**
   - Build Command: `next build`
   - Output Directory: (leave blank)
6. **Before clicking Deploy**, expand **Environment Variables** and add them
   now — see the next step. (If you already deployed, that's fine; add them
   after and redeploy.)

---

## 11. Add production environment variables

In Vercel: **Project Settings → Environment Variables**. Add each of these,
ticked for **Production**, **Preview**, and **Development**:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | The service_role key |
| `RESEND_API_KEY` | Your Resend API key |
| `NEWSLETTER_FROM` | `Northeastern Journal <newsletter@northeasternjournal.com>` |
| `NEWSLETTER_REPLY_TO` | `editor@northeasternjournal.com` |
| `NEWSLETTER_MAILING_ADDRESS` | Your real postal address |
| `NEXT_PUBLIC_SITE_URL` | `https://www.northeasternjournal.com` |
| `CRON_SECRET` | A long random string (`openssl rand -hex 32`) |

Then go to **Deployments**, click the most recent one, and choose
**Redeploy** — environment variables only take effect on a new build.

> `NEXT_PUBLIC_SITE_URL` has **no trailing slash**. Links in emails are built
> from it, and a trailing slash produces `//article/...`.

---

## 12. Point your domain at Vercel

1. In Vercel: **Project Settings → Domains**.
2. Enter `northeasternjournal.com` and click **Add**.
3. Add `www.northeasternjournal.com` too, and set one to redirect to the other
   (Vercel offers this; pick `www` as the primary to match the current site).
4. Vercel shows the DNS records to create:
   - For the apex domain: an `A` record pointing to `76.76.21.21`
   - For `www`: a `CNAME` pointing to `cname.vercel-dns.com`
5. Add those at your registrar. Do not remove the Resend records from step 8 —
   they coexist.
6. Wait for Vercel to show **Valid Configuration**. DNS usually propagates in
   minutes; allow up to 48 hours.

SSL certificates are issued automatically once DNS resolves.

---

## 13. Finish the Supabase redirect URLs

Password-recovery and invite emails must know where to send editors in
production.

1. Supabase → **Authentication → URL Configuration**.
2. Set **Site URL** to `https://www.northeasternjournal.com`.
3. Under **Redirect URLs**, add all of these:
   ```
   https://www.northeasternjournal.com/auth/callback
   https://northeasternjournal.com/auth/callback
   http://localhost:3000/auth/callback
   ```
4. If you use Vercel preview deployments, also add:
   ```
   https://*-your-vercel-team.vercel.app/auth/callback
   ```
5. Click **Save**.

> Skipping this is the single most common cause of "the recovery link takes me
> to the wrong site" or "invalid redirect URL".

---

## 14. Turn on scheduled publishing

`vercel.json` declares the cron job:

```json
{ "path": "/api/cron/publish-scheduled", "schedule": "0 11 * * *" }
```

Vercel registers it automatically on your next deploy. To confirm:

1. Vercel → **Project → Cron Jobs**.
2. You should see `/api/cron/publish-scheduled`.

Vercel sends `CRON_SECRET` as a bearer token, which is why that variable is
required. Without it, scheduled articles will not go live on their own.

### About that schedule

**The Vercel Hobby plan allows one cron run per day.** Anything more frequent
makes the deployment fail outright with a plan-limit error — not a warning, a
hard failure.

So the schedule is set to `0 11 * * *`: once daily at 11:00 UTC, which is 6am
Central (5am during standard time). An article scheduled for Tuesday afternoon
will not appear until Wednesday morning.

If that's too coarse — and for a working newsroom it probably is — you have two
options:

1. **Upgrade to Vercel Pro** and change the schedule to `*/5 * * * *`. Scheduled
   articles then go live within five minutes of their time.
2. **Stay on Hobby and publish manually.** The **Publish** button is instant and
   always available; scheduling is a convenience, not the only path. Nothing
   else on the site depends on cron.

You can also trigger a publishing run by hand at any time:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://www.northeasternjournal.com/api/cron/publish-scheduled
```

---

## 15. Test production

Work through this list on the live site. It takes about ten minutes and catches
almost everything.

**Sign in**
- [ ] Visit `https://www.northeasternjournal.com/login`
- [ ] Enter your email and password, click **Sign in**
- [ ] You land on `/admin`

**Publish**
- [ ] Click **Write an article**
- [ ] Type a headline — the URL slug fills in by itself
- [ ] Write a paragraph, upload a featured image, pick a category and author
- [ ] Leave **Notify subscribers** unchecked
- [ ] Click **Publish**
- [ ] Open the public URL. The article is live, and the placeholder articles in
      that section have disappeared

**Edit and unpublish**
- [ ] Change the headline, click **Save** — the change appears on the live site
- [ ] Click **Unpublish** — the public URL now 404s
- [ ] Publish it again

**Schedule**
- [ ] Set a schedule time 6 minutes out, click **Schedule**
- [ ] The article shows as *Scheduled* and is not publicly visible
- [ ] Wait for the cron to run; confirm it goes live

**Newsletter**
- [ ] On `/newsletter`, subscribe with a personal address
- [ ] Receive the confirmation email; click **Confirm Subscription**
- [ ] Receive the welcome email
- [ ] In `/admin/subscribers`, the count reads 1 confirmed
- [ ] Publish an article with **Notify subscribers** checked
- [ ] Receive the announcement, with image, byline, and a working **Read
      Article** button
- [ ] Click **Unsubscribe**; the subscriber shows as unsubscribed in the
      dashboard

**Weekly issue**
- [ ] In `/admin/newsletter`, click **Compose this week's issue**
- [ ] The lead, *New this week*, and *What readers are reading* are already
      filled in from your published articles
- [ ] Write an editor's note; the preview pane updates after **Save draft**
- [ ] Click **Send test to me** and check it in a real inbox
- [ ] Click **Send to N** and confirm; the issue flips to *Sent*
- [ ] The issue appears at `/newsletter/archive` and reads the same as the email
- [ ] Clicking **Send** again reports that it has already gone out

**Team**
- [ ] In `/admin/team`, invite a test email as *Contributor*
- [ ] Sign in as that address in a private window
- [ ] Confirm you can write a draft but the **Publish** button is disabled

**Public site**
- [ ] Homepage, a category page, an author page, and search all load
- [ ] Run the live URL through <https://pagespeed.web.dev>
- [ ] Paste an article URL into <https://search.google.com/test/rich-results>
      and confirm the NewsArticle structured data is detected

---

## 16. Day-to-day: publishing an article

Once the above is done, publishing looks like this:

1. Go to `northeasternjournal.com/admin`
2. Click **Write an article**
3. Type the headline. The URL fills itself in.
4. Write the story. Use the toolbar for subheadings, quotes, links, and
   inline images — or click **Write in Markdown** if you prefer.
5. Upload a featured image and write one line of alt text.
6. Pick a category, an author, and a few tags.
7. Optionally tick **Notify subscribers**.
8. Click **Publish**.

That's under a minute once you're used to it. Nothing needs deploying; the
article is live as soon as the button finishes.

---

## Troubleshooting

**"You're signed in, but not on the masthead"**
The allowlist didn't match your email. In Supabase SQL Editor:
```sql
select * from public.admin_allowlist;
update public.profiles set role = 'admin' where email = 'your@email.com';
```
The first query should show your address. If the case differs, the trigger
still matches — it compares lowercased. Running the `update` fixes an account
that was created before the allowlist row existed.

**Sign in says "That email and password don't match an account"**
The account doesn't exist yet, or the password is wrong. Check
**Authentication → Users** in Supabase — create the user, or reset the password
from their row menu.

**Sign in succeeds but lands on "no access"**
The account exists but the email isn't in `admin_allowlist` with a newsroom
role. Add it from /admin/team, or run the `update public.profiles` query above.

**Password recovery link goes to localhost from the live site**
The Supabase **Site URL** is still `http://localhost:3000`. See step 13.

**Recovery link says "invalid redirect URL"**
The exact callback URL isn't in Supabase's Redirect URLs list. It must include
the `/auth/callback` path, not just the domain.

**Newsletter signup says "isn't set up yet"**
`SUPABASE_SERVICE_ROLE_KEY` is missing in the deployed environment. Add it in
Vercel and redeploy.

**Confirmation emails never arrive**
Check Resend → **Logs**. If sends are being rejected, the domain isn't verified
(step 8) or `NEWSLETTER_FROM` uses a domain other than the verified one.

**Scheduled articles never publish**
Check Vercel → **Cron Jobs** for the job, and **Logs** for its runs. A 401 means
`CRON_SECRET` differs between Vercel's cron config and the environment
variable — redeploy after setting it.

**Everything 401s with "permission denied for table ..."**
The API roles have no table-level GRANT. Row Level Security controls which
*rows* a role sees; it does not grant access to the table itself, and tables
created from the SQL Editor don't always inherit Supabase's default
privileges. Run `supabase/migrations/0004_grant_table_privileges.sql`. The
public site keeps working while this is broken — it falls back to the
placeholder archive and logs `[content] failed to load articles: permission
denied` in the Vercel function logs.

**A reader was able to make themselves an admin**
Run `supabase/migrations/0003_harden_profile_privileges.sql`, then audit:
```sql
select email, role from public.profiles where role in ('admin', 'editor');
```
Only the two founding addresses should be listed. Reset anyone else with
`update public.profiles set role = 'reader' where email = '...';`

**Images fail to upload**
Confirm the `media` bucket exists and is public (step 5), and that you're
signed in as admin, editor, or contributor. Files over 10 MB are rejected by
design.

**The site shows placeholder articles alongside real ones**
That's intended in sections where you haven't published yet. Placeholders
disappear from a listing as soon as it contains one real article. To hide them
everywhere immediately, publish at least one article per section — or delete
the seed data from `src/lib/content/data.ts`.

**Changes don't appear on the live site**
Publishing clears the cache automatically. If something looks stale, check that
`updateTag` ran without error in Vercel's function logs, or redeploy.
