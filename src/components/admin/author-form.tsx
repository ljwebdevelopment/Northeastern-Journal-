"use client";

import Link from "next/link";
import { startTransition, useActionState, useId, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import type { Author } from "@/lib/content/types";
import { slugify } from "@/lib/richtext";
import { saveAuthorAction } from "@/app/admin/authors/actions";
import { initialAuthorFormState } from "@/app/admin/authors/state";
import { FieldGroup, TextField, inputClasses } from "./profile-fields";
import { PhotoField, ProfileDetailSections } from "./profile-form";

/** A blank profile for the Add Author form, with the schema's defaults. */
export const EMPTY_AUTHOR: Author = {
  slug: "",
  name: "",
  role: "Contributor",
  photo: "",
  bio: "",
  longBio: "",
  social: {},
  relatedTopics: [],
  quotes: [],
  readingList: [],
  timeline: [],
  professionalLinks: [],
  showSubscriberCount: true,
};

function FieldError({ error, hint }: { error?: string; hint?: React.ReactNode }) {
  if (error) return <p className="mt-1.5 text-xs font-medium text-brand">{error}</p>;
  return hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null;
}

/**
 * Name and slug, together: the slug follows the name until someone edits it
 * by hand. On an existing profile it starts out pinned, so fixing a typo in a
 * name never silently moves the author's public URL.
 */
function NameAndSlug({
  initialName,
  initialSlug,
  baselineSlug,
  isNew,
  errors,
}: {
  initialName: string;
  initialSlug: string;
  /** The slug currently live — the stored one, or the last one saved. */
  baselineSlug: string;
  isNew: boolean;
  errors: Record<string, string>;
}) {
  const nameId = useId();
  const slugId = useId();
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [slugTouched, setSlugTouched] = useState(!isNew);

  const moved = !isNew && slugify(slug) !== baselineSlug;

  return (
    <>
      <div>
        <label htmlFor={nameId} className="block text-xs font-semibold uppercase tracking-wide text-muted">
          Full name<span className="ml-1 text-brand">*</span>
        </label>
        <input
          id={nameId}
          name="name"
          required
          value={name}
          maxLength={120}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          aria-invalid={Boolean(errors.name)}
          className={`${inputClasses} mt-1.5 ${errors.name ? "border-brand" : ""}`}
        />
        <FieldError error={errors.name} />
      </div>

      <div>
        <label htmlFor={slugId} className="block text-xs font-semibold uppercase tracking-wide text-muted">
          URL slug<span className="ml-1 text-brand">*</span>
        </label>
        <div className={`mt-1.5 flex items-center rounded-lg border bg-background text-sm focus-within:border-brand ${errors.slug ? "border-brand" : "border-border"}`}>
          <span className="shrink-0 pl-3.5 text-muted">/author/</span>
          <input
            id={slugId}
            name="slug"
            value={slug}
            maxLength={80}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
            }}
            onBlur={() => setSlug((s) => slugify(s))}
            aria-invalid={Boolean(errors.slug)}
            className="w-full min-w-0 bg-transparent py-2.5 pr-3.5 outline-none"
          />
        </div>
        <FieldError
          error={errors.slug}
          hint={
            isNew ? (
              "Filled in from the name. Edit it if you want a different URL."
            ) : (
              <>
                Locked to the current URL.{" "}
                {name && slugify(name) !== slug && (
                  <button
                    type="button"
                    onClick={() => setSlug(slugify(name))}
                    className="font-semibold text-brand hover:underline"
                  >
                    Use “{slugify(name)}”
                  </button>
                )}
              </>
            )
          }
        />
        {moved && (
          <p className="mt-2 flex items-start gap-2 rounded-lg bg-brand/10 px-3 py-2 text-xs text-brand">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Saving moves this profile from /author/{baselineSlug} to /author/{slugify(slug) || "…"}.
            Links to the old address will stop working.
          </p>
        )}
      </div>
    </>
  );
}

function SaveBar({ isNew, slug, pending }: { isNew: boolean; slug: string; pending: boolean }) {
  return (
    <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 px-5 py-4 backdrop-blur card-shadow">
      <p className="text-sm text-muted">
        {isNew ? "The profile goes live as soon as you create it." : "Changes go live as soon as you save."}
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/admin/authors"
          className="text-sm font-semibold text-muted transition-colors hover:text-brand"
        >
          Cancel
        </Link>
        {!isNew && (
          <Link
            href={`/author/${slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-brand"
          >
            Preview <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-70"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {pending ? "Saving…" : isNew ? "Create author" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

/**
 * Add / Edit Author. The same fields as Edit Profile — the lower sections are
 * literally the same component — plus the URL slug and beat topics, which
 * only staff set.
 */
export function AuthorForm({
  author = EMPTY_AUTHOR,
  authorId,
  photoUrl = "",
  categories,
}: {
  author?: Author;
  /** Absent when adding a new author. */
  authorId?: string;
  /** The stored photo, empty when unset — `author.photo` falls back to a placeholder. */
  photoUrl?: string;
  categories: { slug: string; name: string }[];
}) {
  const isNew = !authorId;
  const [state, formAction, pending] = useActionState(saveAuthorAction, initialAuthorFormState);
  const errors = state.errors;
  const savedSlug = state.slug ?? author.slug;
  const topics = new Set<string>(author.relatedTopics);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        // Submit through a transition rather than the form's own action, so
        // React doesn't reset the fields afterwards: a validation error must
        // leave everything the editor typed in place.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
      className="space-y-6"
    >
      {authorId && <input type="hidden" name="authorId" value={authorId} />}

      {state.status === "saved" && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-border bg-surface px-5 py-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
          <div>
            <p className="text-sm font-semibold">{state.message}</p>
            <p className="mt-1 text-sm text-muted">
              <Link href={`/author/${savedSlug}`} target="_blank" className="text-brand hover:underline">
                View the public profile
              </Link>
            </p>
          </div>
        </div>
      )}

      {state.status === "error" && (
        <p role="alert" className="rounded-xl bg-brand/10 px-5 py-4 text-sm font-medium text-brand">
          {state.message}
        </p>
      )}

      <FieldGroup title="Identity" description="How the name and title appear on the profile and on bylines.">
        <PhotoField initialUrl={photoUrl} error={errors.photo} />
        <div className="grid gap-5 sm:grid-cols-2">
          <NameAndSlug
            initialName={author.name}
            initialSlug={author.slug}
            baselineSlug={savedSlug}
            isNew={isNew}
            errors={errors}
          />
          <TextField label="Job title" name="role" required defaultValue={author.role} placeholder="Reporter, Editor, Columnist…" error={errors.role} />
          <TextField label="Username (optional)" name="username" defaultValue={author.username ?? ""} placeholder="theirhandle" hint="Shown as @handle; the profile also answers at /author/<handle>." error={errors.username} />
          <TextField label="Founding role (optional)" name="foundingRole" defaultValue={author.foundingRole ?? ""} placeholder="Co-Founder" hint="A badge beside the job title. Leave blank if it doesn't apply." error={errors.foundingRole} />
          <TextField label="Location" name="location" defaultValue={author.location ?? ""} placeholder="Tahlequah, OK" error={errors.location} />
          <TextField label="Personal website" name="website" inputMode="url" defaultValue={author.website ?? ""} placeholder="theirname.com" hint="A bare domain works — we'll add https:// for you." error={errors.website} />
          <TextField label="Contact email (optional)" name="email" type="email" defaultValue={author.email ?? ""} hint="Shown publicly as a Contact button. Also links a newsroom login with this address to the byline." error={errors.email} />
        </div>
      </FieldGroup>

      <FieldGroup title="Beats" description="Sections this author covers. Their profile is listed on these section pages.">
        {categories.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {categories.map((c) => (
              <label key={c.slug} className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  name="relatedTopics"
                  value={c.slug}
                  defaultChecked={topics.has(c.slug)}
                  className="h-4 w-4 accent-[var(--color-brand)]"
                />
                {c.name}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No sections are set up yet.</p>
        )}
      </FieldGroup>

      <ProfileDetailSections author={author} errors={errors} />

      <SaveBar isNew={isNew} slug={savedSlug} pending={pending} />
    </form>
  );
}
