"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

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

const inputClasses =
  "w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-brand";

export function TextField({
  label,
  name,
  defaultValue = "",
  placeholder,
  hint,
  error,
  required = false,
  type = "text",
  inputMode,
  icon,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  type?: string;
  inputMode?: "url" | "email" | "text" | "tel";
  icon?: ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
        {required && <span className="ml-1 text-brand">*</span>}
      </label>
      <div className="relative mt-1.5">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            {icon}
          </span>
        )}
        <input
          id={id}
          name={name}
          type={type}
          inputMode={inputMode}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(inputClasses, icon && "pl-9", error && "border-brand")}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-brand">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function TextAreaField({
  label,
  name,
  defaultValue = "",
  placeholder,
  hint,
  error,
  rows = 4,
  maxLength,
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  rows?: number;
  maxLength?: number;
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
          <span
            className={cn(
              "text-[11px] tabular-nums",
              length > maxLength ? "font-semibold text-brand" : "text-muted"
            )}
          >
            {length}/{maxLength}
          </span>
        )}
      </div>
      <textarea
        id={id}
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(event) => setLength(event.target.value.length)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(inputClasses, "resize-y leading-relaxed", error && "border-brand")}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-brand">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export { inputClasses };
