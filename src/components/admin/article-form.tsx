"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, ExternalLink, Loader2, Trash2 } from "lucide-react";
import type { Article, Author, Category } from "@/lib/content/types";
import { deleteArticleAction, saveArticleAction } from "@/lib/articles/actions";
import { initialArticleFormState } from "@/lib/articles/state";
import { toDateTimeLocal } from "@/lib/articles/schema";
import { FieldGroup, TextAreaField, TextField, inputClasses } from "./form-fields";
import { PhotoField } from "./photo-field";
import { cn } from "@/lib/utils";

function SaveButtons({ isPublished }: { isPublished: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="submit"
        name="status"
        value="published"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-70"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {isPublished ? "Update published article" : "Publish"}
      </button>
      <button
        type="submit"
        name="status"
        value="draft"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:border-brand hover:text-brand disabled:opacity-70"
      >
        Save as draft
      </button>
    </div>
  );
}

export function ArticleForm({
  article,
  categories,
  authors,
  canChooseAuthor,
  defaultAuthorSlug,
}: {
  article?: Article;
  categories: Category[];
  authors: Author[];
  canChooseAuthor: boolean;
  defaultAuthorSlug?: string;
}) {
  const [state, formAction] = useActionState(saveArticleAction, initialArticleFormState);
  const errors = state.errors;
  const isPublished = (article?.status ?? "draft") === "published";

  // A new article gets its slug back from the server on first save, so
  // subsequent saves update that record rather than creating another.
  const slug = state.slug ?? article?.slug ?? "";

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="currentSlug" value={slug} />

      {state.status === "saved" && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-border bg-surface px-5 py-4"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
          <div>
            <p className="text-sm font-semibold">{state.message}</p>
            {state.slug && (
              <p className="mt-1 text-sm text-muted">
                <Link
                  href={`/article/${article?.category ?? "local-news"}/${state.slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-brand hover:underline"
                >
                  View article <ExternalLink className="h-3 w-3" aria-hidden />
                </Link>
              </p>
            )}
          </div>
        </div>
      )}

      {state.status === "error" && (
        <p role="alert" className="rounded-xl bg-brand/10 px-5 py-4 text-sm font-medium text-brand">
          {state.message}
        </p>
      )}

      <FieldGroup title="The story" description="Headline, summary, and body copy.">
        <TextField
          label="Headline"
          name="title"
          required
          defaultValue={article?.title ?? ""}
          error={errors.title}
        />
        <TextAreaField
          label="Summary"
          name="excerpt"
          required
          rows={3}
          maxLength={400}
          defaultValue={article?.excerpt ?? ""}
          hint="Shown on cards, section pages, and in search results."
          error={errors.excerpt}
        />
        <TextAreaField
          label="Article body"
          name="body"
          required
          rows={18}
          defaultValue={article?.body?.join("\n\n") ?? ""}
          hint="Leave a blank line between paragraphs."
          error={errors.body}
        />
      </FieldGroup>

      <FieldGroup
        title="Section & byline"
        description="Where the article files, and who wrote it. Publishing into an empty section makes that section appear on the site."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
              Section <span className="text-brand">*</span>
            </span>
            <select
              name="category"
              defaultValue={article?.category ?? ""}
              className={cn(inputClasses, "mt-1.5", errors.category && "border-brand")}
            >
              <option value="">Choose a section…</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.category && (
              <span className="mt-1.5 block text-xs font-medium text-brand">
                {errors.category}
              </span>
            )}
          </label>

          {canChooseAuthor ? (
            <label className="block">
              <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
                Byline <span className="text-brand">*</span>
              </span>
              <select
                name="authorSlug"
                defaultValue={article?.authorSlug ?? defaultAuthorSlug ?? ""}
                className={cn(inputClasses, "mt-1.5", errors.authorSlug && "border-brand")}
              >
                <option value="">Choose an author…</option>
                {authors.map((a) => (
                  <option key={a.slug} value={a.slug}>
                    {a.name}
                  </option>
                ))}
              </select>
              {errors.authorSlug && (
                <span className="mt-1.5 block text-xs font-medium text-brand">
                  {errors.authorSlug}
                </span>
              )}
            </label>
          ) : (
            <input
              type="hidden"
              name="authorSlug"
              value={article?.authorSlug ?? defaultAuthorSlug ?? ""}
            />
          )}

          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
              Coverage area
            </span>
            <select
              name="region"
              defaultValue={article?.region ?? ""}
              className={cn(inputClasses, "mt-1.5")}
            >
              <option value="">Not region-specific</option>
              <option value="local">Local</option>
              <option value="national">National</option>
              <option value="world">World</option>
            </select>
          </label>

          <TextField
            label="Publish date"
            name="publishedAt"
            type="datetime-local"
            defaultValue={toDateTimeLocal(article?.publishedAt ?? new Date().toISOString())}
          />

          <TextField
            label="Tags"
            name="tags"
            defaultValue={article?.tags?.join(", ") ?? ""}
            placeholder="budget, town-hall"
            hint="Comma separated. Used by search."
          />
        </div>
      </FieldGroup>

      <FieldGroup
        title="Article image"
        description="Optional. Articles without art fall back to a clean text-led card."
      >
        <PhotoField defaultValue={article?.image ?? ""} error={errors.image} />
        <TextField
          label="Image description"
          name="imageAlt"
          defaultValue={article?.imageAlt ?? ""}
          hint="Required when an image is set, for screen readers."
          error={errors.imageAlt}
        />
      </FieldGroup>

      <FieldGroup
        title="Placement"
        description="Where this article is promoted across the site."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ["featured", "Featured", "Eligible for the homepage lead and Featured Work"],
            ["breaking", "Breaking", "Runs in the breaking-news ticker"],
            ["trending", "Trending", "Listed in the Trending column"],
            ["mostRead", "Most read", "Listed in Most Read"],
          ].map(([name, label, hint]) => (
            <label
              key={name}
              className="flex items-start gap-2.5 rounded-lg border border-border px-3.5 py-2.5 text-sm transition-colors hover:border-brand"
            >
              <input
                type="checkbox"
                name={name}
                defaultChecked={Boolean(article?.[name as keyof Article])}
                className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]"
              />
              <span>
                <span className="font-medium">{label}</span>
                <span className="mt-0.5 block text-xs text-muted">{hint}</span>
              </span>
            </label>
          ))}
        </div>
      </FieldGroup>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 px-5 py-4 backdrop-blur card-shadow">
        <p className="text-sm text-muted">
          {isPublished ? "This article is live." : "Not published yet."}
        </p>
        <SaveButtons isPublished={isPublished} />
      </div>

      {slug && (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-serif text-lg font-bold">Delete this article</h2>
          <p className="mt-1.5 text-sm text-muted">
            Removes it from the site permanently. This can&rsquo;t be undone.
          </p>
          <button
            type="submit"
            formAction={deleteArticleAction}
            formNoValidate
            name="slug"
            value={slug}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted transition-colors hover:border-brand hover:text-brand"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete article
          </button>
        </div>
      )}
    </form>
  );
}
