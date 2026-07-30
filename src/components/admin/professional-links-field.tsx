"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ProfessionalLink, ProfessionalLinkKind } from "@/lib/content/types";
import { professionalLinkGroups } from "@/lib/authors/stats";
import { cn } from "@/lib/utils";
import { inputClasses } from "./form-fields";

let rowCounter = 0;
const newRow = (): ProfessionalLink => ({
  id: `new-${Date.now()}-${rowCounter++}`,
  kind: "publication",
  title: "",
});

/**
 * Repeatable editor for outside work. Rows post as indexed form fields
 * (`links[0][title]`…), which `parseProfileForm` reassembles.
 */
export function ProfessionalLinksField({
  defaultValue = [],
  errors = {},
}: {
  defaultValue?: ProfessionalLink[];
  errors?: Record<string, string>;
}) {
  const [rows, setRows] = useState<ProfessionalLink[]>(
    defaultValue.length > 0 ? defaultValue : [newRow()]
  );

  const update = (index: number, patch: Partial<ProfessionalLink>) =>
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <fieldset
          key={row.id}
          className="rounded-xl border border-border bg-background p-4"
        >
          <legend className="px-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Entry {index + 1}
          </legend>

          <input type="hidden" name={`links[${index}][id]`} value={row.id} />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                Type
              </span>
              <select
                name={`links[${index}][kind]`}
                value={row.kind}
                onChange={(event) =>
                  update(index, { kind: event.target.value as ProfessionalLinkKind })
                }
                className={cn(inputClasses, "mt-1.5")}
              >
                {professionalLinkGroups.map((group) => (
                  <option key={group.kind} value={group.kind}>
                    {group.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                Title
              </span>
              <input
                name={`links[${index}][title]`}
                value={row.title}
                onChange={(event) => update(index, { title: event.target.value })}
                placeholder="Headline, award, or segment name"
                className={cn(inputClasses, "mt-1.5")}
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                Outlet
              </span>
              <input
                name={`links[${index}][outlet]`}
                value={row.outlet ?? ""}
                onChange={(event) => update(index, { outlet: event.target.value })}
                placeholder="Publication, wire service, or program"
                className={cn(inputClasses, "mt-1.5")}
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                Year
              </span>
              <input
                name={`links[${index}][year]`}
                value={row.year ?? ""}
                onChange={(event) => update(index, { year: event.target.value })}
                placeholder="2025"
                className={cn(inputClasses, "mt-1.5")}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                Link
              </span>
              <input
                name={`links[${index}][url]`}
                value={row.url ?? ""}
                onChange={(event) => update(index, { url: event.target.value })}
                placeholder="https://example.com/story"
                className={cn(
                  inputClasses,
                  "mt-1.5",
                  errors[`links[${index}][url]`] && "border-brand"
                )}
              />
              {errors[`links[${index}][url]`] && (
                <span className="mt-1.5 block text-xs font-medium text-brand">
                  {errors[`links[${index}][url]`]}
                </span>
              )}
            </label>

            <label className="block sm:col-span-2">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                Note (optional)
              </span>
              <input
                name={`links[${index}][description]`}
                value={row.description ?? ""}
                onChange={(event) => update(index, { description: event.target.value })}
                placeholder="One line of context shown under the title"
                className={cn(inputClasses, "mt-1.5")}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-brand"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove entry
          </button>
        </fieldset>
      ))}

      <button
        type="button"
        onClick={() => setRows((current) => [...current, newRow()])}
        className="inline-flex items-center gap-2 rounded-full border border-dashed border-border px-4 py-2.5 text-xs font-semibold transition-colors hover:border-brand hover:text-brand"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden /> Add another entry
      </button>

      <p className="text-xs text-muted">
        Entries left without a title are dropped when you save — that&rsquo;s
        how you delete one.
      </p>
    </div>
  );
}
