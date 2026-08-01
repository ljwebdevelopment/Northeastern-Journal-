"use client";

import { useId, useState, type ReactNode } from "react";

/** Shared input styling, matching the article editor. */
export const inputClasses =
  "w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-brand";

export function FieldGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="font-serif text-xl font-bold">{title}</h2>
      {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

export function TextField({
  label,
  name,
  defaultValue = "",
  placeholder,
  hint,
  error,
  required,
  type = "text",
  inputMode,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  type?: string;
  inputMode?: "url" | "email" | "text";
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
        {required && <span className="ml-1 text-brand">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        aria-invalid={Boolean(error)}
        className={`${inputClasses} mt-1.5 ${error ? "border-brand" : ""}`}
      />
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-brand">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

export function TextAreaField({
  label,
  name,
  defaultValue = "",
  rows = 4,
  maxLength,
  hint,
  error,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  maxLength?: number;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  const id = useId();
  const [length, setLength] = useState(defaultValue.length);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wide text-muted">
          {label}
          {required && <span className="ml-1 text-brand">*</span>}
        </label>
        {maxLength && (
          <span className="text-[11px] tabular-nums text-muted">
            {length}/{maxLength}
          </span>
        )}
      </div>
      <textarea
        id={id}
        name={name}
        rows={rows}
        maxLength={maxLength}
        defaultValue={defaultValue}
        required={required}
        onChange={(e) => setLength(e.target.value.length)}
        aria-invalid={Boolean(error)}
        className={`${inputClasses} mt-1.5 resize-y leading-relaxed ${error ? "border-brand" : ""}`}
      />
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-brand">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

let counter = 0;
export const newRowId = (prefix: string) => `${prefix}-${Date.now()}-${counter++}`;

/**
 * Add/remove list for the repeatable profile sections. Rows post as indexed
 * fields (`quotes[0][text]`), which the save action reassembles; clearing a
 * row's main field drops it.
 */
export function RepeatableField<T extends { id: string }>({
  name,
  label,
  addLabel,
  hint,
  initial,
  makeRow,
  renderRow,
}: {
  name: string;
  label: string;
  addLabel: string;
  hint: string;
  initial: T[];
  makeRow: () => T;
  renderRow: (row: T, index: number, update: (patch: Partial<T>) => void) => ReactNode;
}) {
  const [rows, setRows] = useState<T[]>(initial.length > 0 ? initial : [makeRow()]);

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <fieldset key={row.id} className="rounded-xl border border-border bg-background p-4">
          <legend className="px-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            {label} {index + 1}
          </legend>
          <input type="hidden" name={`${name}[${index}][id]`} value={row.id} />
          {renderRow(row, index, (patch) =>
            setRows((current) => current.map((r, i) => (i === index ? { ...r, ...patch } : r)))
          )}
          <button
            type="button"
            onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
            className="mt-3 text-xs font-semibold text-muted transition-colors hover:text-brand"
          >
            Remove
          </button>
        </fieldset>
      ))}

      <button
        type="button"
        onClick={() => setRows((current) => [...current, makeRow()])}
        className="rounded-full border border-dashed border-border px-4 py-2.5 text-xs font-semibold transition-colors hover:border-brand hover:text-brand"
      >
        + {addLabel}
      </button>

      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}
