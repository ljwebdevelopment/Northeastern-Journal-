"use client";

import { useActionState } from "react";
import { updateMediaAltText, type ActionState } from "@/app/admin/actions";

const initial: ActionState = { ok: true, message: "" };

/**
 * Inline alt-text editing for one file.
 *
 * Its own client component so each card in the grid keeps its own pending and
 * result state — a single shared form action would make every card flicker
 * when one of them saved.
 */
export function MediaAltForm({ id, altText }: { id: string; altText: string }) {
  const [state, formAction, pending] = useActionState(updateMediaAltText, initial);

  return (
    <form action={formAction} className="flex gap-1.5">
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={`alt-${id}`}>
        Alt text
      </label>
      <input
        id={`alt-${id}`}
        name="alt_text"
        defaultValue={altText}
        placeholder="Describe this image…"
        className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-brand"
      />
      <button
        disabled={pending}
        className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
      >
        {pending ? "…" : state.message && state.ok ? "Saved" : "Save"}
      </button>
    </form>
  );
}
