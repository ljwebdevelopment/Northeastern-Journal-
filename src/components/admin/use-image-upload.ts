"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/richtext";

const MAX_BYTES = 10 * 1024 * 1024; // matches the bucket's file_size_limit
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

/**
 * Uploads to the public `media` bucket and records a row in `public.media`
 * so the newsroom keeps a searchable record of every asset (alt text, credit,
 * who uploaded it).
 *
 * The upload runs as the signed-in user, so storage RLS decides whether it's
 * allowed — a reader can't slip an image in by calling this directly.
 */
export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File): Promise<string | null> => {
    setError(null);

    if (!ACCEPTED.includes(file.type)) {
      setError("Use a JPEG, PNG, WebP, AVIF, or GIF image.");
      return null;
    }
    if (file.size > MAX_BYTES) {
      setError(`That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 10 MB.`);
      return null;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      return null;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const base = slugify(file.name.replace(/\.[^.]+$/, "")) || "image";
      const now = new Date();
      const path = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${base}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(path, file, { cacheControl: "31536000", upsert: false });

      if (uploadError) {
        setError(uploadError.message);
        return null;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("media").getPublicUrl(path);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Metadata is best-effort — a failure here shouldn't lose the upload.
      await supabase.from("media").insert({
        storage_path: path,
        public_url: publicUrl,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        uploaded_by: user?.id ?? null,
      });

      return publicUrl;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading, error, setError };
}
