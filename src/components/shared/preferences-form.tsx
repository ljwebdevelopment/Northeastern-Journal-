"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { savePreferences, type PreferencesState } from "@/app/newsletter/preferences/actions";
import { cn } from "@/lib/utils";

const initial: PreferencesState = { ok: true, message: "" };

const CADENCES = [
  {
    value: "immediate",
    label: "As it publishes",
    hint: "An email each time we run something you follow.",
  },
  {
    value: "daily",
    label: "Daily digest",
    hint: "One email a day, collecting everything.",
  },
  {
    value: "weekly",
    label: "Weekly",
    hint: "One email on Sundays. The Sunday Letter.",
  },
] as const;

/**
 * Preferences, reachable from any email without signing in.
 *
 * "Everything" is the honest default for an empty selection — a reader with no
 * sections chosen has not opted out of the paper, they simply haven't chosen,
 * and silently sending them nothing would be a bug they'd never report.
 */
export function PreferencesForm({
  token,
  email,
  frequency,
  categories,
  authors,
  selectedCategories,
  selectedAuthors,
  unsubscribeUrl,
}: {
  token: string;
  email: string;
  frequency: string;
  categories: { slug: string; name: string }[];
  authors: { slug: string; name: string }[];
  selectedCategories: string[];
  selectedAuthors: string[];
  unsubscribeUrl: string;
}) {
  const [state, formAction, pending] = useActionState(savePreferences, initial);

  return (
    <form action={formAction} className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <input type="hidden" name="token" value={token} />

      <p className="text-sm text-muted">
        Settings for <span className="font-semibold text-foreground">{email}</span>
      </p>

      {/* ----------------------------------------------------------- */}
      <fieldset className="mt-8">
        <legend className="font-serif text-lg font-bold">How often</legend>
        <div className="mt-3 space-y-2">
          {CADENCES.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:border-brand"
            >
              <input
                type="radio"
                name="frequency"
                value={option.value}
                defaultChecked={frequency === option.value}
                className="mt-1 h-4 w-4 accent-[var(--brand)]"
              />
              <span className="text-sm">
                <span className="font-semibold">{option.label}</span>
                <span className="mt-0.5 block text-xs text-muted">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* ----------------------------------------------------------- */}
      {categories.length > 0 && (
        <fieldset className="mt-8">
          <legend className="font-serif text-lg font-bold">Sections</legend>
          <p className="mt-1 text-xs text-muted">
            Choose none to get everything we publish.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {categories.map((category) => (
              <label key={category.slug} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  name="categories"
                  value={category.slug}
                  defaultChecked={selectedCategories.includes(category.slug)}
                  className="h-4 w-4 accent-[var(--brand)]"
                />
                {category.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* ----------------------------------------------------------- */}
      {authors.length > 0 && (
        <fieldset className="mt-8">
          <legend className="font-serif text-lg font-bold">Writers you follow</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {authors.map((author) => (
              <label key={author.slug} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  name="authors"
                  value={author.slug}
                  defaultChecked={selectedAuthors.includes(author.slug)}
                  className="h-4 w-4 accent-[var(--brand)]"
                />
                {author.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {state.message && (
        <p
          role="status"
          className={cn(
            "mt-6 flex items-start gap-2 rounded-lg px-4 py-3 text-sm",
            state.ok
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "bg-brand/10 text-brand"
          )}
        >
          {state.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {state.message}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save preferences
        </button>

        {/* Unmistakable and one click, in line with CAN-SPAM: a preferences
            page must not become a way to hide the exit. */}
        <a href={unsubscribeUrl} className="text-sm font-semibold text-muted hover:text-brand">
          Unsubscribe from everything
        </a>
      </div>
    </form>
  );
}
