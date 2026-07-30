"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import type { Author, Category } from "@/lib/content/types";
import { socialPlatforms } from "@/lib/authors/social";
import { saveProfileAction } from "@/lib/authors/actions";
import { initialProfileFormState } from "@/lib/authors/profile-form-state";
import { FieldGroup, TextAreaField, TextField } from "./form-fields";
import { PhotoField } from "./photo-field";
import { ProfessionalLinksField } from "./professional-links-field";

function SaveBar({ slug, message }: { slug: string; message?: string }) {
  const { pending } = useFormStatus();
  return (
    <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 px-5 py-4 backdrop-blur card-shadow">
      <p className="text-sm text-muted">{message ?? "Changes go live as soon as you save."}</p>
      <div className="flex items-center gap-3">
        <Link
          href={`/author/${slug}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-brand"
        >
          Preview <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-70"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {pending ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}

export function ProfileForm({
  author,
  categories,
}: {
  author: Author;
  categories: Category[];
}) {
  const [state, formAction] = useActionState(saveProfileAction, initialProfileFormState);
  const errors = state.errors;
  const social = { ...author.social, x: author.social.x || author.social.twitter };

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="slug" value={author.slug} />

      {state.status === "saved" && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-border bg-surface px-5 py-4"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
          <div>
            <p className="text-sm font-semibold">{state.message}</p>
            <p className="mt-1 text-sm text-muted">
              <Link href={`/author/${author.slug}`} target="_blank" className="text-brand hover:underline">
                View your public profile
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

      <FieldGroup
        title="Identity"
        description="How your name and title appear on your profile, article bylines, and contributor cards."
      >
        <PhotoField defaultValue={author.photo} error={errors.photo} />

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Full name"
            name="name"
            required
            defaultValue={author.name}
            error={errors.name}
          />
          <TextField
            label="Job title"
            name="role"
            required
            defaultValue={author.role}
            placeholder="Editor, Publisher, Columnist…"
            error={errors.role}
          />
          <TextField
            label="Location"
            name="location"
            defaultValue={author.location ?? ""}
            placeholder="City, State or bureau"
            error={errors.location}
          />
          {/* Deliberately a text input, not type="url": the browser would
              reject a bare domain before the server could normalize it. */}
          <TextField
            label="Personal website"
            name="website"
            inputMode="url"
            defaultValue={author.website ?? ""}
            placeholder="yourname.com"
            hint="A bare domain works — we'll add https:// for you."
            error={errors.website}
          />
          <TextField
            label="Contact email (optional)"
            name="email"
            type="email"
            defaultValue={author.email ?? ""}
            hint="Shown publicly as a Contact button. Leave blank to hide it."
            error={errors.email}
          />
        </div>
      </FieldGroup>

      <FieldGroup
        title="Biography"
        description="The short bio runs under bylines and on cards; the full biography anchors the “About the Author” section."
      >
        <TextAreaField
          label="Short bio"
          name="bio"
          required
          rows={3}
          maxLength={320}
          defaultValue={author.bio}
          hint="One or two sentences."
          error={errors.bio}
        />
        <TextAreaField
          label="Full biography"
          name="longBio"
          required
          rows={10}
          maxLength={8000}
          defaultValue={author.longBio}
          hint="Leave a blank line between paragraphs to break them up on the page."
          error={errors.longBio}
        />
        <TextAreaField
          label="Featured quote"
          name="featuredQuote"
          rows={3}
          maxLength={400}
          defaultValue={author.featuredQuote ?? ""}
          hint="Displayed large in your profile hero. Skip the quotation marks."
          error={errors.featuredQuote}
        />
      </FieldGroup>

      <FieldGroup
        title="Social links"
        description="Only the platforms you fill in appear as icons on your profile."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {socialPlatforms.map(({ key, label, icon: Icon, placeholder }) => (
            <TextField
              key={key}
              label={label}
              name={`social.${key}`}
              inputMode="url"
              defaultValue={social[key] ?? ""}
              placeholder={placeholder}
              error={errors[`social.${key}`]}
              icon={<Icon className="h-4 w-4" />}
            />
          ))}
        </div>
      </FieldGroup>

      <FieldGroup
        title="Work published elsewhere"
        description="Syndicated columns, outside bylines, awards, press appearances, and portfolio links. These group themselves into sections on your profile."
      >
        <ProfessionalLinksField defaultValue={author.professionalLinks} errors={errors} />
      </FieldGroup>

      <FieldGroup
        title="Beats"
        description="The categories you cover. These become topic links on your profile."
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <label
              key={category.slug}
              className="flex items-center gap-2.5 rounded-lg border border-border px-3.5 py-2.5 text-sm transition-colors hover:border-brand"
            >
              <input
                type="checkbox"
                name="relatedTopics"
                value={category.slug}
                defaultChecked={author.relatedTopics.includes(category.slug)}
                className="h-4 w-4 accent-[var(--color-brand)]"
              />
              {category.name}
            </label>
          ))}
        </div>
      </FieldGroup>

      <SaveBar
        slug={author.slug}
        message={
          author.updatedAt
            ? `Last saved ${new Date(author.updatedAt).toLocaleString("en-US")}.`
            : undefined
        }
      />
    </form>
  );
}
