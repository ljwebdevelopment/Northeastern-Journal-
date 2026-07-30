"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import NextImage from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  ImagePlus,
  Loader2,
  Send,
  Trash2,
} from "lucide-react";
import { saveArticle, sendAnnouncementForm, type ActionState } from "@/app/admin/actions";
import { RichTextEditor } from "./rich-text-editor";
import { useImageUpload } from "./use-image-upload";
import { autoExcerpt, htmlToText, readingMinutesFor, slugify } from "@/lib/richtext";
import { cn } from "@/lib/utils";
import type { ArticleStatus } from "@/lib/supabase/types";

export interface EditorArticle {
  id?: string;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  bodyHtml: string;
  bodyMarkdown: string;
  status: ArticleStatus;
  publishedAt: string | null;
  scheduledFor: string | null;
  categorySlug: string;
  authorSlug: string;
  featuredImageUrl: string;
  featuredImageAlt: string;
  featuredImageCaption: string;
  seoTitle: string;
  metaDescription: string;
  tags: string[];
  region: string;
  isFeatured: boolean;
  isBreaking: boolean;
  isTrending: boolean;
  notifySubscribers: boolean;
  notifiedAt: string | null;
  updatedAt?: string | null;
}

interface Option {
  slug: string;
  name: string;
}

const initialState: ActionState = { ok: true, message: "" };

export function ArticleEditor({
  article,
  categories,
  authors,
  canPublish,
  subscriberCount,
  emailReady,
}: {
  article: EditorArticle;
  categories: Option[];
  authors: Option[];
  canPublish: boolean;
  subscriberCount: number;
  emailReady: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveArticle, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  const [title, setTitle] = useState(article.title);
  // The slug tracks the headline until an editor types their own, after which
  // it's theirs. Derived during render rather than synced in an effect.
  const [slugOverride, setSlugOverride] = useState<string | null>(
    article.slug || null
  );
  const slug = slugOverride ?? slugify(title);
  const [bodyHtml, setBodyHtml] = useState(article.bodyHtml);
  const [excerpt, setExcerpt] = useState(article.excerpt);
  const [seoTitle, setSeoTitle] = useState(article.seoTitle);
  const [metaDescription, setMetaDescription] = useState(article.metaDescription);
  const [imageUrl, setImageUrl] = useState(article.featuredImageUrl);
  const [imageAlt, setImageAlt] = useState(article.featuredImageAlt);
  const [notify, setNotify] = useState(article.notifySubscribers);
  const [scheduledFor, setScheduledFor] = useState(
    article.scheduledFor ? toLocalInput(article.scheduledFor) : ""
  );
  // Absolute instant for the datetime-local value, resolved in the browser's
  // timezone. `new Date("2026-08-01T14:30")` is local time here, which is what
  // the editor means; the server cannot infer that on its own.
  const scheduledForIso = useMemo(() => {
    if (!scheduledFor) return "";
    const parsed = new Date(scheduledFor);
    return Number.isNaN(+parsed) ? "" : parsed.toISOString();
  }, [scheduledFor]);
  const [intent, setIntent] = useState("save");
  const [markdownMode, setMarkdownMode] = useState(false);
  const [markdown, setMarkdown] = useState(article.bodyMarkdown);

  const { upload, uploading, error: uploadError } = useImageUpload();

  const stats = useMemo(() => {
    const text = htmlToText(bodyHtml);
    const words = text ? text.trim().split(/\s+/).length : 0;
    return { words, minutes: readingMinutesFor(bodyHtml) };
  }, [bodyHtml]);

  const submitWith = (nextIntent: string) => {
    setIntent(nextIntent);
    // Let React commit the hidden input before the form posts.
    queueMicrotask(() => formRef.current?.requestSubmit());
  };

  async function pickFeaturedImage(file: File) {
    const url = await upload(file);
    if (url) setImageUrl(url);
  }

  const isLive = article.status === "published";
  const publicHref = article.categorySlug
    ? `/article/${article.categorySlug}/${slug}`
    : null;

  return (
    <form ref={formRef} action={formAction} className="pb-24">
      <input type="hidden" name="id" value={article.id ?? ""} />
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="body_html" value={markdownMode ? "" : bodyHtml} />
      <input type="hidden" name="featured_image_url" value={imageUrl} />

      {/* ---------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/articles"
            className="text-sm font-medium text-muted hover:text-brand"
          >
            ← Articles
          </Link>
          <StatusBadge status={article.status} scheduledFor={article.scheduledFor} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isLive && publicHref && (
            <Link
              href={publicHref}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-sm font-semibold hover:border-brand hover:text-brand"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View
            </Link>
          )}

          <button
            type="button"
            disabled={pending}
            onClick={() => submitWith("save")}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold hover:border-brand disabled:opacity-60"
          >
            {pending && intent === "save" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            Save
          </button>

          {isLive ? (
            <button
              type="button"
              disabled={pending || !canPublish}
              onClick={() => submitWith("draft")}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold hover:border-brand disabled:opacity-60"
            >
              <Eye className="h-3.5 w-3.5" /> Unpublish
            </button>
          ) : null}

          <button
            type="button"
            disabled={pending || !canPublish}
            onClick={() => submitWith("publish")}
            title={canPublish ? undefined : "Contributors can't publish — save a draft for review."}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending && intent === "publish" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            {isLive ? "Update" : "Publish"}
          </button>
        </div>
      </div>

      {state.message && (
        <div
          role="status"
          className={cn(
            "mt-4 flex items-start gap-2 rounded-lg px-4 py-3 text-sm",
            state.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-brand/10 text-brand"
          )}
        >
          {state.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{state.message}</span>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Two-column body                                                   */}
      {/* ---------------------------------------------------------------- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Main column ---------------------------------------------------- */}
        <div className="min-w-0 space-y-5">
          <div>
            <label htmlFor="title" className="sr-only">
              Headline
            </label>
            <input
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Headline"
              required
              className="w-full border-0 bg-transparent p-0 font-serif text-3xl font-bold leading-tight outline-none placeholder:text-muted/50 sm:text-4xl"
            />
            {state.errors?.title && (
              <p className="mt-1 text-sm text-brand">{state.errors.title}</p>
            )}
          </div>

          <div>
            <label htmlFor="subtitle" className="sr-only">
              Standfirst
            </label>
            <input
              id="subtitle"
              name="subtitle"
              defaultValue={article.subtitle}
              placeholder="Standfirst — one line of context under the headline (optional)"
              className="w-full border-0 bg-transparent p-0 text-lg text-muted outline-none placeholder:text-muted/50"
            />
          </div>

          <div className="flex items-center justify-between border-y border-border py-2 text-xs text-muted">
            <span>
              {stats.words.toLocaleString()} words · {stats.minutes} min read
            </span>
            <button
              type="button"
              onClick={() => setMarkdownMode((v) => !v)}
              className="font-semibold hover:text-brand"
            >
              {markdownMode ? "Switch to rich text" : "Write in Markdown"}
            </button>
          </div>

          {markdownMode ? (
            <div>
              <textarea
                name="body_markdown"
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                rows={24}
                placeholder={"## A subheading\n\nWrite in Markdown. It converts to formatted text on save."}
                className="w-full rounded-xl border border-border bg-surface p-4 font-mono text-sm leading-relaxed outline-none focus:border-brand"
              />
              <p className="mt-2 text-xs text-muted">
                Markdown replaces the rich-text body when you save.
              </p>
            </div>
          ) : (
            <>
              <RichTextEditor
                value={bodyHtml}
                onChange={setBodyHtml}
                onImageRequest={async () => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  return new Promise<string | null>((resolve) => {
                    input.onchange = async () => {
                      const file = input.files?.[0];
                      if (!file) return resolve(null);
                      resolve(await upload(file));
                    };
                    input.click();
                  });
                }}
              />
              <input type="hidden" name="body_markdown" value="" />
            </>
          )}
          {state.errors?.body && <p className="text-sm text-brand">{state.errors.body}</p>}
        </div>

        {/* Sidebar --------------------------------------------------------- */}
        <aside className="space-y-4">
          {/* Featured image */}
          <Panel title="Featured image">
            {imageUrl ? (
              <div className="space-y-3">
                <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-surface-muted">
                  {/* Unoptimized: the URL may be an arbitrary host the editor pasted in. */}
                  <NextImage
                    src={imageUrl}
                    alt=""
                    fill
                    sizes="320px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-brand"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center transition-colors hover:border-brand">
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted" />
                ) : (
                  <ImagePlus className="h-6 w-6 text-muted" />
                )}
                <span className="text-sm font-semibold">
                  {uploading ? "Uploading…" : "Upload an image"}
                </span>
                <span className="text-xs text-muted">JPEG, PNG, WebP or AVIF · up to 10 MB</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void pickFeaturedImage(file);
                  }}
                />
              </label>
            )}

            {uploadError && <p className="mt-2 text-xs text-brand">{uploadError}</p>}

            <Field label="Alt text" hint="Describe the image for screen readers and search.">
              <input
                name="featured_image_alt"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Caption">
              <input
                name="featured_image_caption"
                defaultValue={article.featuredImageCaption}
                className={inputClass}
              />
            </Field>
          </Panel>

          {/* Organise */}
          <Panel title="Organise">
            <Field label="Category">
              <select name="category" defaultValue={article.categorySlug} className={inputClass}>
                <option value="">— none —</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Author">
              <select name="author" defaultValue={article.authorSlug} className={inputClass}>
                <option value="">— none —</option>
                {authors.map((a) => (
                  <option key={a.slug} value={a.slug}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tags" hint="Comma separated.">
              <input
                name="tags"
                defaultValue={article.tags.join(", ")}
                placeholder="city-council, budget"
                className={inputClass}
              />
            </Field>

            <Field label="Desk">
              <select name="region" defaultValue={article.region} className={inputClass}>
                <option value="">— unset —</option>
                <option value="local">Local</option>
                <option value="national">National</option>
                <option value="world">World</option>
              </select>
            </Field>

            <div className="mt-3 space-y-2">
              <Check name="is_featured" label="Feature on the homepage" defaultChecked={article.isFeatured} />
              <Check name="is_trending" label="Show in Trending" defaultChecked={article.isTrending} />
              <Check name="is_breaking" label="Breaking news ticker" defaultChecked={article.isBreaking} />
            </div>
          </Panel>

          {/* Publishing */}
          <Panel title="Publishing">
            <Field label="URL slug" hint={`/article/${article.categorySlug || "…"}/${slug || "…"}`}>
              <input
                name="slug"
                value={slug}
                onChange={(e) => setSlugOverride(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field
              label="Schedule for later"
              hint={scheduledForIso ? `Publishes ${new Date(scheduledForIso).toLocaleString()} your time.` : undefined}
            >
              <input
                type="datetime-local"
                name="scheduled_for"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className={inputClass}
              />
            </Field>
            {/*
              `datetime-local` submits no timezone, so the server would read it
              as UTC and publish hours early. Send the absolute instant, resolved
              in the editor's own timezone, and let the server prefer it.
            */}
            <input type="hidden" name="scheduled_for_iso" value={scheduledForIso} />
            {state.errors?.scheduled_for && (
              <p className="text-xs text-brand">{state.errors.scheduled_for}</p>
            )}

            <button
              type="button"
              disabled={pending || !canPublish || !scheduledFor}
              onClick={() => submitWith("schedule")}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-brand disabled:opacity-50"
            >
              <Clock className="h-3.5 w-3.5" /> Schedule
            </button>

            {article.id && (
              <button
                type="button"
                disabled={pending}
                onClick={() => submitWith("archive")}
                className="mt-2 w-full rounded-full px-4 py-2 text-xs font-semibold text-muted hover:text-brand"
              >
                Archive this article
              </button>
            )}
          </Panel>

          {/* Newsletter */}
          <Panel title="Newsletter">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                name="notify_subscribers"
                checked={notify}
                onChange={(e) => setNotify(e.target.checked)}
                disabled={Boolean(article.notifiedAt)}
                className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
              />
              <span className="text-sm">
                <span className="font-semibold">Notify subscribers</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                  {article.notifiedAt
                    ? `Announcement already sent ${new Date(article.notifiedAt).toLocaleString()}.`
                    : subscriberCount > 0
                      ? `Emails ${subscriberCount.toLocaleString()} confirmed subscriber${subscriberCount === 1 ? "" : "s"} when this publishes. Leave unchecked to publish silently.`
                      : "No confirmed subscribers yet. Leave unchecked to publish silently."}
                </span>
              </span>
            </label>

            {!emailReady && (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-muted">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Resend isn&apos;t configured, so no email will be sent.
              </p>
            )}

            {isLive && !article.notifiedAt && canPublish && (
              <button
                type="submit"
                formAction={sendAnnouncementForm}
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:border-brand"
              >
                <Send className="h-3.5 w-3.5" /> Send announcement now
              </button>
            )}
          </Panel>

          {/* SEO */}
          <Panel title="Search & social">
            <Field
              label="Summary"
              hint="Shown on cards and in the newsletter. Auto-written if left blank."
            >
              <textarea
                name="excerpt"
                rows={3}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder={autoExcerpt(bodyHtml, 120) || "A one-sentence summary."}
                className={inputClass}
              />
            </Field>

            <Field label="SEO title" hint={`${(seoTitle || title).length}/60 characters`}>
              <input
                name="seo_title"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder={title}
                className={inputClass}
              />
            </Field>

            <Field
              label="Meta description"
              hint={`${(metaDescription || excerpt).length}/160 characters`}
            >
              <textarea
                name="meta_description"
                rows={3}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder={excerpt}
                className={inputClass}
              />
            </Field>
          </Panel>

          {article.updatedAt && (
            <p className="px-1 text-xs text-muted">
              Last saved {new Date(article.updatedAt).toLocaleString()}
            </p>
          )}
        </aside>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-3 block first:mt-0">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block break-words text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Check({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 accent-[var(--brand)]"
      />
      {label}
    </label>
  );
}

export function StatusBadge({
  status,
  scheduledFor,
}: {
  status: ArticleStatus;
  scheduledFor?: string | null;
}) {
  const styles: Record<ArticleStatus, string> = {
    published: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
    scheduled: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    draft: "bg-surface-muted text-muted",
    archived: "bg-surface-muted text-muted line-through",
  };
  const label =
    status === "scheduled" && scheduledFor
      ? `Scheduled · ${new Date(scheduledFor).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}`
      : status[0].toUpperCase() + status.slice(1);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        styles[status]
      )}
    >
      {label}
    </span>
  );
}

/** `datetime-local` needs a local-time string, not an ISO/UTC one. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
