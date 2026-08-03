"use client";

import { useActionState, useMemo, useState } from "react";
import NextImage from "next/image";
import Link from "next/link";
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { saveCollectionItem } from "@/app/admin/collections/actions";
import type { ActionState } from "@/app/admin/actions";
import type { CollectionDef, Field } from "@/app/admin/collections/schema";
import { RichTextEditor } from "./rich-text-editor";
import { useImageUpload } from "./use-image-upload";
import { slugify } from "@/lib/richtext";
import { cn } from "@/lib/utils";

const initialState: ActionState = { ok: true, message: "" };

export interface CollectionOption {
  slug: string;
  name: string;
}

/**
 * One form for every collection, driven by the schema.
 *
 * Only three field kinds need their own state: images (an upload that has to
 * survive the round trip), rich text (an editor that isn't an <input>), and
 * dates (which have to be sent as an absolute instant, since datetime-local
 * carries no timezone). Everything else is an uncontrolled input, which is why
 * this stays short.
 */
export function CollectionForm({
  def,
  item,
  authors,
  categories,
}: {
  def: CollectionDef;
  /** Column values, or an empty object for a new item. */
  item: Record<string, unknown>;
  authors: CollectionOption[];
  categories: CollectionOption[];
}) {
  const [state, formAction, pending] = useActionState(saveCollectionItem, initialState);

  const id = typeof item.id === "string" ? item.id : "";
  const [title, setTitle] = useState(String(item.title ?? ""));
  const [slugOverride, setSlugOverride] = useState<string | null>(
    typeof item.slug === "string" && item.slug ? item.slug : null
  );
  const slug = slugOverride ?? slugify(title);

  return (
    <form action={formAction} className="mx-auto max-w-3xl pb-20">
      <input type="hidden" name="type" value={def.type} />
      <input type="hidden" name="id" value={id} />

      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/admin/collections/${def.type}`}
          className="text-sm font-medium text-muted hover:text-brand"
        >
          ← {def.label}
        </Link>

        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              name="is_published"
              defaultChecked={item.is_published !== false}
              className="h-4 w-4 accent-[var(--brand)]"
            />
            Visible to readers
          </label>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save
          </button>
        </div>
      </header>

      {state.message && (
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
          <span>{state.message}</span>
        </div>
      )}

      <div className="mt-6 space-y-5 rounded-xl border border-border bg-surface p-5 sm:p-6">
        {def.fields.map((field) =>
          field.name === "title" ? (
            <Labelled key={field.name} field={field} error={state.errors?.[field.name]}>
              <input
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className={inputClass}
              />
            </Labelled>
          ) : (
            <Labelled key={field.name} field={field} error={state.errors?.[field.name]}>
              <FieldInput
                field={field}
                value={item[field.name]}
                authors={authors}
                categories={categories}
              />
            </Labelled>
          )
        )}

        <Labelled
          field={{
            name: "slug",
            label: "URL slug",
            kind: "text",
            hint: `${def.publicPath}/${slug || "…"}`,
          }}
        >
          <input
            name="slug"
            value={slug}
            onChange={(e) => setSlugOverride(e.target.value)}
            className={inputClass}
          />
        </Labelled>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

function FieldInput({
  field,
  value,
  authors,
  categories,
}: {
  field: Field;
  value: unknown;
  authors: CollectionOption[];
  categories: CollectionOption[];
}) {
  const text = value == null ? "" : String(value);

  switch (field.kind) {
    case "textarea":
      return <textarea name={field.name} rows={4} defaultValue={text} className={inputClass} />;

    case "dialogue":
      return (
        <textarea
          name={field.name}
          rows={16}
          defaultValue={text}
          placeholder={"Jane Doe: The budget was never the point.\n\nJohn Roe: It was the only point."}
          className={cn(inputClass, "font-mono text-sm leading-relaxed")}
        />
      );

    case "html":
      return <HtmlField name={field.name} initial={text} />;

    case "image":
      return <ImageField name={field.name} initial={text} />;

    case "date":
      return <DateField name={field.name} initial={text} />;

    case "number":
      return (
        <input type="number" name={field.name} defaultValue={text || "0"} className={inputClass} />
      );

    case "url":
      return (
        <input type="url" name={field.name} defaultValue={text} placeholder="https://" className={inputClass} />
      );

    case "select":
      return (
        <select name={field.name} defaultValue={text} className={inputClass}>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case "author":
    case "category": {
      const options = field.kind === "author" ? authors : categories;
      return (
        <select name={field.name} defaultValue={text} className={inputClass}>
          <option value="">— none —</option>
          {options.map((option) => (
            <option key={option.slug} value={option.slug}>
              {option.name}
            </option>
          ))}
        </select>
      );
    }

    case "slugs":
      return (
        <input
          name={field.name}
          defaultValue={Array.isArray(value) ? value.join(", ") : text}
          placeholder="cheryl-leeds, cherokee-nana"
          className={inputClass}
        />
      );

    default:
      return <input name={field.name} defaultValue={text} className={inputClass} />;
  }
}

/** Rich text posts through a hidden input, since the editor isn't a form control. */
function HtmlField({ name, initial }: { name: string; initial: string }) {
  const [html, setHtml] = useState(initial);
  const { upload } = useImageUpload();

  return (
    <>
      <input type="hidden" name={name} value={html} />
      <RichTextEditor
        value={html}
        onChange={setHtml}
        onImageRequest={async () => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          return new Promise<string | null>((resolve) => {
            input.onchange = async () => {
              const file = input.files?.[0];
              resolve(file ? await upload(file) : null);
            };
            input.click();
          });
        }}
      />
    </>
  );
}

function ImageField({ name, initial }: { name: string; initial: string }) {
  const [url, setUrl] = useState(initial);
  const { upload, uploading, error } = useImageUpload();

  return (
    <div>
      <input type="hidden" name={name} value={url} />

      {url ? (
        <div className="space-y-2">
          <div className="relative aspect-[16/9] max-w-sm overflow-hidden rounded-lg bg-surface-muted">
            {/* Unoptimized: the URL may be any host an editor pasted in. */}
            <NextImage src={url} alt="" fill sizes="384px" className="object-cover" unoptimized />
          </div>
          <button
            type="button"
            onClick={() => setUrl("")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-brand"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      ) : (
        <label className="flex max-w-sm cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-6 text-center transition-colors hover:border-brand">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          ) : (
            <ImagePlus className="h-5 w-5 text-muted" />
          )}
          <span className="text-sm font-semibold">
            {uploading ? "Uploading…" : "Upload an image"}
          </span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const uploaded = await upload(file);
              if (uploaded) setUrl(uploaded);
            }}
          />
        </label>
      )}

      {error && <p className="mt-2 text-xs text-brand">{error}</p>}
    </div>
  );
}

/**
 * Sends the absolute instant alongside the local one.
 *
 * `datetime-local` submits "2026-08-01T14:30" with no timezone, and the server
 * would read that as UTC — the same trap the article scheduler documents.
 */
function DateField({ name, initial }: { name: string; initial: string }) {
  const [local, setLocal] = useState(() => toLocalInput(initial));

  const iso = useMemo(() => {
    if (!local) return "";
    const parsed = new Date(local);
    return Number.isNaN(+parsed) ? "" : parsed.toISOString();
  }, [local]);

  return (
    <>
      <input
        type="datetime-local"
        name={name}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className={inputClass}
      />
      <input type="hidden" name={`${name}_iso`} value={iso} />
    </>
  );
}

function toLocalInput(iso: string): string {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(+date)) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand";

function Labelled({
  field,
  error,
  children,
}: {
  field: Field;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">
        {field.label}
        {field.required && <span className="text-brand"> *</span>}
      </span>
      {children}
      {field.hint && (
        <span className="mt-1 block break-words text-xs text-muted">{field.hint}</span>
      )}
      {error && <span className="mt-1 block text-xs text-brand">{error}</span>}
    </label>
  );
}
