"use client";

import { useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";

let counter = 0;
export const newRowId = (prefix: string) => `${prefix}-${Date.now()}-${counter++}`;

/**
 * Generic add/remove list for the profile editor. Rows post as indexed
 * form fields (`quotes[0][text]`…), which `parseProfileForm` reassembles;
 * clearing a row's main field drops it on save.
 */
export function RepeatableField<T extends { id: string }>({
  name,
  label,
  addLabel,
  emptyHint,
  initial,
  makeRow,
  renderRow,
}: {
  name: string;
  label: string;
  addLabel: string;
  emptyHint: string;
  initial: T[];
  makeRow: () => T;
  renderRow: (row: T, index: number, update: (patch: Partial<T>) => void) => ReactNode;
}) {
  const [rows, setRows] = useState<T[]>(initial.length > 0 ? initial : [makeRow()]);

  const update = (index: number, patch: Partial<T>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <fieldset key={row.id} className="rounded-xl border border-border bg-background p-4">
          <legend className="px-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            {label} {index + 1}
          </legend>
          <input type="hidden" name={`${name}[${index}][id]`} value={row.id} />
          {renderRow(row, index, (patch) => update(index, patch))}
          <button
            type="button"
            onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-brand"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
          </button>
        </fieldset>
      ))}

      <button
        type="button"
        onClick={() => setRows((current) => [...current, makeRow()])}
        className="inline-flex items-center gap-2 rounded-full border border-dashed border-border px-4 py-2.5 text-xs font-semibold transition-colors hover:border-brand hover:text-brand"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden /> {addLabel}
      </button>

      <p className="text-xs text-muted">{emptyHint}</p>
    </div>
  );
}
