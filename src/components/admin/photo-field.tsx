"use client";

import { useRef, useState } from "react";
import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputClasses } from "./form-fields";

const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Profile photo picker: upload a file or paste a link. Whichever is used,
 * the resulting value lands in a single hidden `photo` input the form
 * submits, so the server only ever deals with one field.
 */
export function PhotoField({
  defaultValue = "",
  error,
}: {
  defaultValue?: string;
  error?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploadError("");
    if (!file.type.startsWith("image/")) {
      setUploadError("Choose an image file (JPEG, PNG, WebP, or GIF).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError("That image is larger than 2 MB. Please choose a smaller file.");
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const result = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !result.url) {
        setUploadError(result.error ?? "Upload failed. Please try again.");
        return;
      }
      setValue(result.url);
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
        Profile photo
      </span>

      <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-muted">
          {value ? (
            // The source is an author-supplied URL or an uploaded data image.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Profile photo preview" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center px-3 text-center text-[11px] text-muted">
              No photo yet
            </span>
          )}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="h-5 w-5 animate-spin text-brand" aria-hidden />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold transition-colors hover:border-brand hover:text-brand disabled:opacity-60"
            >
              <ImageUp className="h-3.5 w-3.5" aria-hidden />
              {uploading ? "Uploading…" : "Upload a photo"}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => setValue("")}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted transition-colors hover:border-brand hover:text-brand"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
              </button>
            )}
          </div>

          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = "";
            }}
          />

          <label className="block">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
              …or paste an image link
            </span>
            <input
              type="text"
              inputMode="url"
              value={value.startsWith("data:") ? "" : value}
              placeholder="https://example.com/your-photo.jpg"
              onChange={(event) => setValue(event.target.value)}
              className={cn(inputClasses, "mt-1.5")}
            />
          </label>

          <p className="text-xs text-muted">
            Square images at least 800×800 look best. Maximum upload size 2 MB.
          </p>

          {(uploadError || error) && (
            <p className="text-xs font-medium text-brand">{uploadError || error}</p>
          )}
        </div>
      </div>

      <input type="hidden" name="photo" value={value} />
    </div>
  );
}
