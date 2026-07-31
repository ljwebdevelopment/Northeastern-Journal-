import { NextResponse, type NextRequest } from "next/server";
import { getCurrentAccount } from "@/lib/auth/session";

/**
 * Profile photo upload.
 *
 * The image is returned as a `data:` URL and stored inline on the author
 * profile. That keeps uploads working on every host — including read-only
 * serverless filesystems — with no object-storage account to configure.
 * Swap this handler for an S3/Vercel Blob upload if you'd rather serve
 * photos from a CDN; the rest of the app only cares that `photo` is a
 * string it can put in an `src`.
 */

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: NextRequest) {
  const account = await getCurrentAccount();
  if (!account) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Choose a JPEG, PNG, WebP, or GIF image." },
      { status: 415 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That image is larger than 2 MB. Please choose a smaller file." },
      { status: 413 }
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return NextResponse.json({ url: `data:${file.type};base64,${btoa(binary)}` });
}
