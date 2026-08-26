"use client";

/**
 * Shrinks an image in the browser before it is uploaded.
 *
 * Everything the newsroom uploads is stored once and then served for the life
 * of the article — to readers, to crawlers building share cards, and to every
 * subscriber's mail client. Storing a 12 MP phone photo at full resolution
 * means paying to move those bytes on every one of those paths, and Supabase
 * meters all of it against one monthly egress allowance.
 *
 * Resizing here fixes the problem at the source: the optimizer can only ever
 * make a stored image smaller, so an oversized original inflates every
 * derivative and every cache entry downstream.
 *
 * This is deliberately conservative. Anything it cannot handle confidently —
 * an animated GIF, a browser without canvas encoding, a file that is already
 * small, a re-encode that came out bigger — is passed through untouched. The
 * upload path stays working even when the optimisation does not apply.
 */

/** Long edge, in pixels. Comfortably above the 1200px share card and the widest layout slot. */
const MAX_DIMENSION = 1600;

/** JPEG quality. High enough that photographs show no visible artefacts at this size. */
const QUALITY = 0.82;

/** Animated formats lose their animation on a canvas round-trip, so they are left alone. */
const SKIP = ["image/gif", "image/svg+xml"];

export interface DownscaleResult {
  file: File;
  /** True when the image was actually re-encoded, for messaging in the UI. */
  changed: boolean;
  originalBytes: number;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

export async function downscaleImage(file: File): Promise<DownscaleResult> {
  const untouched: DownscaleResult = { file, changed: false, originalBytes: file.size };
  if (SKIP.includes(file.type)) return untouched;
  if (typeof createImageBitmap !== "function") return untouched;

  try {
    // `from-image` applies the EXIF orientation, so portrait photos off a
    // phone are not silently rotated by the canvas round-trip.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));

    // Already within bounds and not heavy enough to be worth re-encoding.
    if (scale === 1 && file.size <= 1_000_000) {
      bitmap.close();
      return untouched;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return untouched;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    // PNG keeps its transparency; everything else becomes JPEG, which is the
    // one format every mail client and crawler renders without negotiation.
    const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await canvasToBlob(canvas, outputType);
    if (!blob || blob.size >= file.size) return untouched;

    const ext = outputType === "image/png" ? "png" : "jpg";
    const name = `${file.name.replace(/\.[^.]+$/, "")}.${ext}`;
    return {
      file: new File([blob], name, { type: outputType, lastModified: Date.now() }),
      changed: true,
      originalBytes: file.size,
    };
  } catch {
    // Corrupt file, unsupported codec, cross-origin taint — upload the original.
    return untouched;
  }
}
