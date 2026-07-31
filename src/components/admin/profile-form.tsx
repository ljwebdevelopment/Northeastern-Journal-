"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import type { Author, Category } from "@/lib/content/types";
import { socialPlatforms } from "@/lib/authors/social";
import { saveProfileAction } from "@/lib/authors/actions";
import { initialProfileFormState } from "@/lib/authors/profile-form-state";
import { FieldGroup, TextAreaField, TextField, inputClasses } from "./form-fields";
import { PhotoField } from "./photo-field";
import { ProfessionalLinksField } from "./professional-links-field";
import { RepeatableField, newRowId } from "./repeatable-field";
import { cn } from "@/lib/utils";

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
            label="Username (optional)"
            name="username"
            defaultValue={author.username ?? ""}
            placeholder="yourhandle"
            hint={`Shown as @handle. Your profile also works at /author/${author.username || "yourhandle"}.`}
            error={errors.username}
          />
          <TextField
            label="Founding role (optional)"
            name="foundingRole"
            defaultValue={author.foundingRole ?? ""}
            placeholder="Co-Founder"
            hint="Shown as a badge beside your job title. Leave blank if it doesn't apply."
            error={errors.foundingRole}
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
        title="Subscribers"
        description="Readers can subscribe to you directly from your profile, the way they follow a writer on Substack."
      >
        <label className="flex items-start gap-3 rounded-lg border border-border px-4 py-3.5 text-sm">
          <input
            type="checkbox"
            name="showSubscriberCount"
            defaultChecked={author.showSubscriberCount ?? true}
            className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]"
          />
          <span>
            <span className="font-medium">Show my subscriber count publicly</span>
            <span className="mt-1 block text-xs text-muted">
              The Subscribe button always appears. Untick this to keep the
              number private while you build an audience — it stays hidden
              until you have subscribers either way.
            </span>
          </span>
        </label>
      </FieldGroup>

      <FieldGroup
        title="Notable quotes"
        description="Lines you're known for. They appear as pull quotes on your profile."
      >
        <RepeatableField
          name="quotes"
          label="Quote"
          addLabel="Add a quote"
          emptyHint="Quotes left blank are dropped when you save."
          initial={author.quotes ?? []}
          makeRow={() => ({ id: newRowId("quote"), text: "", source: "" })}
          renderRow={(row, index, update) => (
            <div className="space-y-3">
              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  Quote
                </span>
                <textarea
                  name={`quotes[${index}][text]`}
                  value={row.text}
                  onChange={(e) => update({ text: e.target.value })}
                  rows={2}
                  placeholder="Something you said worth repeating"
                  className={cn(inputClasses, "mt-1.5 resize-y")}
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  Source (optional)
                </span>
                <input
                  name={`quotes[${index}][source]`}
                  value={row.source ?? ""}
                  onChange={(e) => update({ source: e.target.value })}
                  placeholder="Column, talk, or interview"
                  className={cn(inputClasses, "mt-1.5")}
                />
              </label>
            </div>
          )}
        />
      </FieldGroup>

      <FieldGroup
        title="Reading recommendations"
        description="Books and pieces you point readers toward."
      >
        <RepeatableField
          name="reading"
          label="Recommendation"
          addLabel="Add a recommendation"
          emptyHint="Entries without a title are dropped when you save."
          initial={author.readingList ?? []}
          makeRow={() => ({ id: newRowId("reading"), title: "", note: "", url: "" })}
          renderRow={(row, index, update) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  Title
                </span>
                <input
                  name={`reading[${index}][title]`}
                  value={row.title}
                  onChange={(e) => update({ title: e.target.value })}
                  className={cn(inputClasses, "mt-1.5")}
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  Link (optional)
                </span>
                <input
                  name={`reading[${index}][url]`}
                  value={row.url ?? ""}
                  onChange={(e) => update({ url: e.target.value })}
                  placeholder="https://example.com/book"
                  className={cn(
                    inputClasses,
                    "mt-1.5",
                    errors[`reading[${index}][url]`] && "border-brand"
                  )}
                />
                {errors[`reading[${index}][url]`] && (
                  <span className="mt-1.5 block text-xs font-medium text-brand">
                    {errors[`reading[${index}][url]`]}
                  </span>
                )}
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  Why you recommend it
                </span>
                <input
                  name={`reading[${index}][note]`}
                  value={row.note ?? ""}
                  onChange={(e) => update({ note: e.target.value })}
                  className={cn(inputClasses, "mt-1.5")}
                />
              </label>
            </div>
          )}
        />
      </FieldGroup>

      <FieldGroup
        title="Career timeline"
        description="Milestones shown as a vertical timeline on your profile."
      >
        <RepeatableField
          name="timeline"
          label="Milestone"
          addLabel="Add a milestone"
          emptyHint="Milestones left blank are dropped when you save."
          initial={author.timeline ?? []}
          makeRow={() => ({ id: newRowId("timeline"), year: "", label: "" })}
          renderRow={(row, index, update) => (
            <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  Year
                </span>
                <input
                  name={`timeline[${index}][year]`}
                  value={row.year}
                  onChange={(e) => update({ year: e.target.value })}
                  placeholder="2015"
                  className={cn(inputClasses, "mt-1.5")}
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  What happened
                </span>
                <input
                  name={`timeline[${index}][label]`}
                  value={row.label}
                  onChange={(e) => update({ label: e.target.value })}
                  className={cn(inputClasses, "mt-1.5")}
                />
              </label>
            </div>
          )}
        />
      </FieldGroup>

      <FieldGroup
        title="Media & speaking"
        description="Your podcast, video playlist, and speaking availability."
      >
        <TextField
          label="Podcast link"
          name="podcastUrl"
          inputMode="url"
          defaultValue={author.podcastUrl ?? ""}
          placeholder="https://example.com/your-podcast"
          hint="Shows a listen card on your profile. Leave blank to hide it."
          error={errors.podcastUrl}
        />
        <TextField
          label="Video playlist name"
          name="videoPlaylist"
          defaultValue={author.videoPlaylist ?? ""}
          placeholder="Cherokee Nana Talks"
          hint="Videos tagged with this playlist name appear on your profile."
        />
        <TextAreaField
          label="Speaking & bookings"
          name="speaking"
          rows={4}
          maxLength={1200}
          defaultValue={author.speaking ?? ""}
          hint="A short invitation for speaking or interview requests. Leave blank to hide the section."
        />
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
