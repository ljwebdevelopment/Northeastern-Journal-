"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { saveIssue } from "@/app/admin/newsletter/actions";
import { ConfirmSubmit } from "./confirm-submit";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/app/admin/actions";

/**
 * The weekly newsletter composer.
 *
 * Three ideas hold this screen together:
 *
 *  1. **It arrives pre-filled.** The server picks the lead, the week's new
 *     reporting, and the trending five before this ever renders. The editor's
 *     job is to disagree where they disagree, and write the note.
 *  2. **The preview is the real email.** The iframe loads the same HTML Resend
 *     will send, rendered by the same template — not an approximation.
 *  3. **You cannot send what you haven't saved.** The send buttons post the
 *     stored row, so they stay disabled until the form is clean. Otherwise an
 *     editor would rewrite the intro, hit send, and mail the old one.
 */

export interface CandidateArticle {
  id: string;
  title: string;
  categoryName: string | null;
  authorName: string | null;
  publishedAt: string;
  viewCount: number;
  isTrending: boolean;
  /** Published since the last issue went out. */
  isNew: boolean;
}

export interface ComposerIssue {
  id: string;
  issueNumber: number;
  slug: string;
  title: string;
  summary: string;
  intro: string;
  status: "draft" | "sent";
  leadId: string;
  latestIds: string[];
  trendingIds: string[];
  sentAt: string | null;
  succeeded: number;
  failed: number;
}

const initialState: ActionState = { ok: true, message: "" };

const VISIBLE_LIMIT = 12;

export function NewsletterComposer({
  issue,
  candidates,
  subscriberCount,
  emailReady,
  editorEmail,
  sendTestAction,
  sendAction,
  deleteAction,
  notice,
}: {
  issue: ComposerIssue;
  candidates: CandidateArticle[];
  subscriberCount: number;
  emailReady: boolean;
  editorEmail: string;
  sendTestAction: (formData: FormData) => void;
  sendAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
  notice?: string;
}) {
  const [state, formAction, pending] = useActionState(saveIssue, initialState);
  const sent = issue.status === "sent";

  const [title, setTitle] = useState(issue.title);
  const [summary, setSummary] = useState(issue.summary);
  const [intro, setIntro] = useState(issue.intro);
  const [leadId, setLeadId] = useState(issue.leadId);
  const [latestIds, setLatestIds] = useState<string[]>(issue.latestIds);
  const [trendingIds, setTrendingIds] = useState<string[]>(issue.trendingIds);

  /** Bumped after every successful save so the preview iframe reloads. */
  const [previewVersion, setPreviewVersion] = useState(0);
  const savedSnapshot = useRef(snapshotOf(issue));

  const current = JSON.stringify({
    title,
    summary,
    intro,
    leadId,
    latestIds: [...latestIds].sort(),
    trendingIds: [...trendingIds].sort(),
  });
  const dirty = current !== savedSnapshot.current;

  useEffect(() => {
    if (state.ok && state.message) {
      savedSnapshot.current = JSON.stringify({
        title,
        summary,
        intro,
        leadId,
        latestIds: [...latestIds].sort(),
        trendingIds: [...trendingIds].sort(),
      });
      setPreviewVersion((v) => v + 1);
    }
    // Only react to a new action result, not to every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Ordered for display: newest first for the week's work, most-read first for
  // trending. `getAll` on the server reads them back in this same DOM order,
  // which is the order they ship in.
  const byDate = candidates;
  const byReads = useMemo(
    () =>
      [...candidates].sort((a, b) => {
        if (a.isTrending !== b.isTrending) return a.isTrending ? -1 : 1;
        return b.viewCount - a.viewCount;
      }),
    [candidates]
  );

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const selectedCount =
    (leadId ? 1 : 0) +
    latestIds.filter((id) => id !== leadId).length +
    trendingIds.filter((id) => id !== leadId).length;

  const canSend = !sent && !dirty && emailReady && selectedCount > 0;

  return (
    <div className="mx-auto max-w-[86rem]">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="kicker">
            <Link href="/admin/newsletter" className="hover:text-brand">
              Newsletter
            </Link>{" "}
            · Issue No. {issue.issueNumber}
          </p>
          <h1 className="mt-1 font-serif text-2xl font-bold">
            {title || "Untitled issue"}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {sent && issue.sentAt ? (
              <>
                Sent {new Date(issue.sentAt).toLocaleString()} ·{" "}
                {issue.succeeded.toLocaleString()} delivered
                {issue.failed > 0 && ` · ${issue.failed} failed`}
              </>
            ) : (
              <>
                Draft · {selectedCount} article{selectedCount === 1 ? "" : "s"} ·{" "}
                {subscriberCount.toLocaleString()} subscriber
                {subscriberCount === 1 ? "" : "s"}
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {sent ? (
            <Link
              href={`/newsletter/${issue.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-sm font-semibold hover:border-brand hover:text-brand"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View in archive
            </Link>
          ) : (
            <>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={issue.id} />
                <ConfirmSubmit
                  message="Delete this draft issue? This cannot be undone."
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-sm font-semibold text-muted hover:border-brand hover:text-brand"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </ConfirmSubmit>
              </form>

              <form action={sendTestAction}>
                <input type="hidden" name="id" value={issue.id} />
                <button
                  type="submit"
                  disabled={!emailReady || dirty}
                  title={
                    dirty
                      ? "Save your changes first."
                      : `Sends one copy to ${editorEmail}.`
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold hover:border-brand disabled:opacity-50"
                >
                  <Mail className="h-3.5 w-3.5" /> Send test to me
                </button>
              </form>

              <button
                type="submit"
                form="issue-form"
                disabled={pending || !dirty}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold hover:border-brand disabled:opacity-50"
              >
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {dirty ? "Save draft" : "Saved"}
              </button>

              <form action={sendAction}>
                <input type="hidden" name="id" value={issue.id} />
                <ConfirmSubmit
                  message={`Send Issue No. ${issue.issueNumber} to ${subscriberCount.toLocaleString()} subscribers? This cannot be undone.`}
                  disabled={!canSend}
                  title={
                    dirty
                      ? "Save your changes first."
                      : selectedCount === 0
                        ? "Add at least one article."
                        : undefined
                  }
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-brand-foreground hover:opacity-90 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" /> Send to{" "}
                  {subscriberCount.toLocaleString()}
                </ConfirmSubmit>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Status messages --------------------------------------------------- */}
      {(state.message || notice) && (
        <div
          role="status"
          className={cn(
            "mt-4 flex items-start gap-2 rounded-lg px-4 py-3 text-sm",
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
          <span>{state.message || notice}</span>
        </div>
      )}

      {!emailReady && !sent && (
        <p className="mt-4 rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          Resend isn&apos;t configured, so sending is disabled. You can still
          compose and preview.
        </p>
      )}

      {dirty && !sent && (
        <p className="mt-4 rounded-lg bg-surface-muted px-4 py-3 text-sm text-muted">
          Unsaved changes. Save the draft to refresh the preview and enable
          sending.
        </p>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Composer + preview                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_36rem]">
        <form id="issue-form" action={formAction} className="min-w-0 space-y-5">
          <input type="hidden" name="id" value={issue.id} />

          <Panel
            title="Subject line"
            hint="What subscribers see in their inbox. Keep it under about 60 characters."
          >
            <input
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={sent}
              required
              className={fieldClass}
            />
            {state.errors?.title && (
              <p className="mt-1 text-sm text-brand">{state.errors.title}</p>
            )}
            <p className="mt-2 text-xs text-muted">{title.length} characters</p>
          </Panel>

          <Panel
            title="Preview text"
            hint="The grey line Gmail shows after the subject. Also the blurb in the public archive."
          >
            <input
              name="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              disabled={sent}
              placeholder="A courthouse ruling, two new schools, and the week in photographs."
              className={fieldClass}
            />
          </Panel>

          <Panel
            title="Editor's note"
            hint="Opens the issue in your own voice. Blank lines start new paragraphs. Optional."
          >
            <textarea
              name="intro"
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              disabled={sent}
              rows={7}
              placeholder="Good morning from Tahlequah…"
              className={cn(fieldClass, "resize-y leading-relaxed")}
            />
          </Panel>

          {/* Lead ---------------------------------------------------------- */}
          <Panel
            title="The lead"
            hint="Runs at the top with its photograph, byline, and summary."
          >
            <select
              name="lead_article_id"
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              disabled={sent}
              className={fieldClass}
            >
              <option value="">No lead story</option>
              {byDate.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                  {a.categoryName ? ` — ${a.categoryName}` : ""} (
                  {new Date(a.publishedAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </Panel>

          {/* New this week -------------------------------------------------- */}
          <PickList
            title="New this week"
            hint="Published since your last issue. Listed newest first, which is the order they appear."
            emptyMessage="Nothing new has been published since the last issue went out."
            items={byDate}
            selected={latestIds}
            excludeId={leadId}
            disabled={sent}
            fieldName="latest_ids"
            onToggle={(id) => setLatestIds((list) => toggle(list, id))}
            badge={(a) => (a.isNew ? "New" : null)}
            meta={(a) =>
              [
                a.categoryName,
                new Date(a.publishedAt).toLocaleDateString(),
                a.authorName,
              ]
                .filter(Boolean)
                .join(" · ")
            }
          />

          {/* Trending ------------------------------------------------------- */}
          <PickList
            title="What readers are reading"
            hint="Ranked by total reads, with marked-as-trending stories first. The pre-selected five come from the last month."
            emptyMessage="No read counts yet. This section is skipped when nothing is selected."
            items={byReads}
            selected={trendingIds}
            excludeId={leadId}
            disabled={sent}
            fieldName="trending_ids"
            onToggle={(id) => setTrendingIds((list) => toggle(list, id))}
            badge={(a) => (a.isTrending ? "Trending" : null)}
            meta={(a) =>
              `${a.viewCount.toLocaleString()} read${a.viewCount === 1 ? "" : "s"}${
                a.categoryName ? ` · ${a.categoryName}` : ""
              }`
            }
          />
        </form>

        {/* Preview ---------------------------------------------------------- */}
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold">Preview</h2>
            <button
              type="button"
              onClick={() => setPreviewVersion((v) => v + 1)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-brand"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
          <p className="mt-1 text-xs text-muted">
            The exact HTML that will be delivered, rendered by the send
            template.
          </p>
          <div className="mt-3 overflow-hidden rounded-xl border border-border bg-white">
            <iframe
              key={previewVersion}
              src={`/admin/newsletter/${issue.id}/preview?v=${previewVersion}`}
              title={`Preview of issue ${issue.issueNumber}`}
              className="h-[calc(100vh-13rem)] w-full min-h-[40rem]"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

const fieldClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-60";

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-sm font-bold">{title}</h2>
      {hint && <p className="mt-1 mb-3 text-xs leading-relaxed text-muted">{hint}</p>}
      {children}
    </section>
  );
}

/**
 * A checkbox list of articles.
 *
 * Collapsed to a dozen rows by default. The selected ones are always rendered,
 * even past the cut — a hidden checked box would silently drop from the issue
 * on save if it were unmounted.
 */
function PickList({
  title,
  hint,
  emptyMessage,
  items,
  selected,
  excludeId,
  disabled,
  fieldName,
  onToggle,
  badge,
  meta,
}: {
  title: string;
  hint: string;
  emptyMessage: string;
  items: CandidateArticle[];
  selected: string[];
  excludeId: string;
  disabled: boolean;
  fieldName: string;
  onToggle: (id: string) => void;
  badge: (a: CandidateArticle) => string | null;
  meta: (a: CandidateArticle) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  const available = items.filter((a) => a.id !== excludeId);
  const visible = expanded
    ? available
    : available.filter((a, i) => i < VISIBLE_LIMIT || selected.includes(a.id));

  const chosen = selected.filter((id) => id !== excludeId).length;

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold">{title}</h2>
        <span className="text-xs text-muted">{chosen} selected</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p>

      {available.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-8 text-center text-xs text-muted">
          {emptyMessage}
        </p>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-border">
            {visible.map((a) => {
              const isSelected = selected.includes(a.id);
              const label = badge(a);
              return (
                <li key={a.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-3 py-2.5",
                      disabled && "cursor-default opacity-70"
                    )}
                  >
                    <input
                      type="checkbox"
                      name={fieldName}
                      value={a.id}
                      checked={isSelected}
                      onChange={() => onToggle(a.id)}
                      disabled={disabled}
                      className="mt-1 h-4 w-4 shrink-0 accent-brand"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-snug">
                        {a.title}
                        {label && (
                          <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-brand">
                            {label}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">{meta(a)}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          {available.length > VISIBLE_LIMIT && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 text-xs font-semibold text-muted hover:text-brand"
            >
              {expanded
                ? "Show fewer"
                : `Show all ${available.length} published articles`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function snapshotOf(issue: ComposerIssue) {
  return JSON.stringify({
    title: issue.title,
    summary: issue.summary,
    intro: issue.intro,
    leadId: issue.leadId,
    latestIds: [...issue.latestIds].sort(),
    trendingIds: [...issue.trendingIds].sort(),
  });
}
