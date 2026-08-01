"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import type { Author } from "@/lib/content/types";
import { saveProfileAction } from "@/app/admin/profile/actions";
import { initialProfileFormState } from "@/app/admin/profile/state";
import {
  FieldGroup,
  RepeatableField,
  TextAreaField,
  TextField,
  inputClasses,
  newRowId,
} from "./profile-fields";

const SOCIAL_PLATFORMS = [
  ["facebook", "Facebook", "https://facebook.com/yourpage"],
  ["instagram", "Instagram", "https://instagram.com/yourhandle"],
  ["x", "X", "https://x.com/yourhandle"],
  ["tiktok", "TikTok", "https://tiktok.com/@yourhandle"],
  ["substack", "Substack", "https://yourname.substack.com"],
  ["linkedin", "LinkedIn", "https://linkedin.com/in/yourname"],
  ["youtube", "YouTube", "https://youtube.com/@yourchannel"],
] as const;

const LINK_KINDS = [
  ["syndicated", "Nationally Syndicated"],
  ["publication", "Other Publications"],
  ["award", "Awards & Honors"],
  ["press", "Press & Appearances"],
  ["portfolio", "Portfolio"],
] as const;

function SaveBar({ slug }: { slug: string }) {
  const { pending } = useFormStatus();
  return (
    <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 px-5 py-4 backdrop-blur card-shadow">
      <p className="text-sm text-muted">Changes go live as soon as you save.</p>
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

export function ProfileForm({ author, authorId }: { author: Author; authorId: string }) {
  const [state, formAction] = useActionState(saveProfileAction, initialProfileFormState);
  const errors = state.errors;
  const social = author.social as Record<string, string | undefined>;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="authorId" value={authorId} />

      {state.status === "saved" && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-border bg-surface px-5 py-4">
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

      <FieldGroup title="Identity" description="How your name and title appear on your profile and bylines.">
        <TextField label="Profile photo URL" name="photo" defaultValue={author.photo ?? ""} inputMode="url" hint="Paste a link, or upload an image in the media library and use its URL." error={errors.photo} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Full name" name="name" required defaultValue={author.name} error={errors.name} />
          <TextField label="Job title" name="role" required defaultValue={author.role} placeholder="Reporter, Editor, Columnist…" error={errors.role} />
          <TextField label="Username (optional)" name="username" defaultValue={author.username ?? ""} placeholder="yourhandle" hint="Shown as @handle; your profile also answers at /author/<handle>." error={errors.username} />
          <TextField label="Founding role (optional)" name="foundingRole" defaultValue={author.foundingRole ?? ""} placeholder="Co-Founder" hint="A badge beside your job title. Leave blank if it doesn't apply." error={errors.foundingRole} />
          <TextField label="Location" name="location" defaultValue={author.location ?? ""} placeholder="Tahlequah, OK" error={errors.location} />
          <TextField label="Personal website" name="website" inputMode="url" defaultValue={author.website ?? ""} placeholder="yourname.com" hint="A bare domain works — we'll add https:// for you." error={errors.website} />
          <TextField label="Contact email (optional)" name="email" type="email" defaultValue={author.email ?? ""} hint="Shown publicly as a Contact button. Blank hides it." error={errors.email} />
        </div>
      </FieldGroup>

      <FieldGroup title="Biography" description="The short bio runs under bylines; the full one anchors “About the Author”.">
        <TextAreaField label="Short bio" name="bio" required rows={3} maxLength={320} defaultValue={author.bio} hint="One or two sentences." error={errors.bio} />
        <TextAreaField label="Full biography" name="longBio" rows={10} maxLength={8000} defaultValue={author.longBio} hint="Leave a blank line between paragraphs." error={errors.longBio} />
        <TextAreaField label="Featured quote" name="featuredQuote" rows={3} maxLength={400} defaultValue={author.featuredQuote ?? ""} hint="Displayed large in your profile hero. Skip the quotation marks." error={errors.featuredQuote} />
      </FieldGroup>

      <FieldGroup title="Social links" description="Only the platforms you fill in appear as icons.">
        <div className="grid gap-5 sm:grid-cols-2">
          {SOCIAL_PLATFORMS.map(([key, label, placeholder]) => (
            <TextField key={key} label={label} name={`social.${key}`} inputMode="url" defaultValue={social?.[key] ?? ""} placeholder={placeholder} error={errors[`social.${key}`]} />
          ))}
        </div>
      </FieldGroup>

      <FieldGroup title="Subscribers" description="Readers can follow you directly from your profile.">
        <label className="flex items-start gap-3 rounded-lg border border-border px-4 py-3.5 text-sm">
          <input type="checkbox" name="showSubscriberCount" defaultChecked={author.showSubscriberCount ?? true} className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]" />
          <span>
            <span className="font-medium">Show my subscriber count publicly</span>
            <span className="mt-1 block text-xs text-muted">
              The Subscribe button always appears. Untick to keep the number private while you build an audience.
            </span>
          </span>
        </label>
      </FieldGroup>

      <FieldGroup title="Notable quotes" description="Lines you're known for, shown as pull quotes.">
        <RepeatableField
          name="quotes"
          label="Quote"
          addLabel="Add a quote"
          hint="Quotes left blank are dropped when you save."
          initial={author.quotes ?? []}
          makeRow={() => ({ id: newRowId("q"), text: "", source: "" })}
          renderRow={(row, index, update) => (
            <div className="space-y-3">
              <textarea name={`quotes[${index}][text]`} value={row.text} onChange={(e) => update({ text: e.target.value })} rows={2} placeholder="Something you said worth repeating" className={`${inputClasses} mt-1.5 resize-y`} />
              <input name={`quotes[${index}][source]`} value={row.source ?? ""} onChange={(e) => update({ source: e.target.value })} placeholder="Where it's from (optional)" className={inputClasses} />
            </div>
          )}
        />
      </FieldGroup>

      <FieldGroup title="Reading recommendations" description="Books and pieces you point readers toward.">
        <RepeatableField
          name="reading"
          label="Recommendation"
          addLabel="Add a recommendation"
          hint="Entries without a title are dropped when you save."
          initial={author.readingList ?? []}
          makeRow={() => ({ id: newRowId("r"), title: "", note: "", url: "" })}
          renderRow={(row, index, update) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <input name={`reading[${index}][title]`} value={row.title} onChange={(e) => update({ title: e.target.value })} placeholder="Title" className={inputClasses} />
              <div>
                <input name={`reading[${index}][url]`} value={row.url ?? ""} onChange={(e) => update({ url: e.target.value })} placeholder="Link (optional)" className={`${inputClasses} ${errors[`reading[${index}][url]`] ? "border-brand" : ""}`} />
                {errors[`reading[${index}][url]`] && <span className="mt-1.5 block text-xs font-medium text-brand">{errors[`reading[${index}][url]`]}</span>}
              </div>
              <input name={`reading[${index}][note]`} value={row.note ?? ""} onChange={(e) => update({ note: e.target.value })} placeholder="Why you recommend it" className={`${inputClasses} sm:col-span-2`} />
            </div>
          )}
        />
      </FieldGroup>

      <FieldGroup title="Career timeline" description="Milestones shown as a vertical timeline.">
        <RepeatableField
          name="timeline"
          label="Milestone"
          addLabel="Add a milestone"
          hint="Milestones left blank are dropped when you save."
          initial={author.timeline ?? []}
          makeRow={() => ({ id: newRowId("t"), year: "", label: "" })}
          renderRow={(row, index, update) => (
            <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
              <input name={`timeline[${index}][year]`} value={row.year} onChange={(e) => update({ year: e.target.value })} placeholder="2016" className={inputClasses} />
              <input name={`timeline[${index}][label]`} value={row.label} onChange={(e) => update({ label: e.target.value })} placeholder="What happened" className={inputClasses} />
            </div>
          )}
        />
      </FieldGroup>

      <FieldGroup title="Work published elsewhere" description="Syndicated columns, outside bylines, awards, press, portfolio. These group themselves into sections on your profile.">
        <RepeatableField
          name="links"
          label="Entry"
          addLabel="Add an entry"
          hint="Entries without a title are dropped when you save."
          initial={author.professionalLinks ?? []}
          makeRow={() => ({ id: newRowId("l"), kind: "publication" as const, title: "" })}
          renderRow={(row, index, update) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <select name={`links[${index}][kind]`} value={row.kind} onChange={(e) => update({ kind: e.target.value as typeof row.kind })} className={inputClasses}>
                {LINK_KINDS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <input name={`links[${index}][title]`} value={row.title} onChange={(e) => update({ title: e.target.value })} placeholder="Headline or award name" className={inputClasses} />
              <input name={`links[${index}][outlet]`} value={row.outlet ?? ""} onChange={(e) => update({ outlet: e.target.value })} placeholder="Outlet or granting body" className={inputClasses} />
              <input name={`links[${index}][year]`} value={row.year ?? ""} onChange={(e) => update({ year: e.target.value })} placeholder="Year" className={inputClasses} />
              <div className="sm:col-span-2">
                <input name={`links[${index}][url]`} value={row.url ?? ""} onChange={(e) => update({ url: e.target.value })} placeholder="Link (optional)" className={`${inputClasses} ${errors[`links[${index}][url]`] ? "border-brand" : ""}`} />
                {errors[`links[${index}][url]`] && <span className="mt-1.5 block text-xs font-medium text-brand">{errors[`links[${index}][url]`]}</span>}
              </div>
              <input name={`links[${index}][description]`} value={row.description ?? ""} onChange={(e) => update({ description: e.target.value })} placeholder="One line of context (optional)" className={`${inputClasses} sm:col-span-2`} />
            </div>
          )}
        />
      </FieldGroup>

      <FieldGroup title="Media & speaking" description="Podcast, video playlist, and speaking availability.">
        <TextField label="Podcast link" name="podcastUrl" inputMode="url" defaultValue={author.podcastUrl ?? ""} placeholder="https://example.com/your-podcast" hint="Shows a listen card. Blank hides it." error={errors.podcastUrl} />
        <TextField label="Video playlist name" name="videoPlaylist" defaultValue={author.videoPlaylist ?? ""} hint="Videos tagged with this playlist appear on your profile." error={errors.videoPlaylist} />
        <TextAreaField label="Speaking & bookings" name="speaking" rows={4} maxLength={1200} defaultValue={author.speaking ?? ""} hint="A short invitation for speaking or interview requests. Blank hides the section." error={errors.speaking} />
      </FieldGroup>

      <SaveBar slug={author.slug} />
    </form>
  );
}
