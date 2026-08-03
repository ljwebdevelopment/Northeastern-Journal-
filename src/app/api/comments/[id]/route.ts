import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Author-initiated comment deletion.
 *
 * Authorised by the token issued when the comment was written, which lives in
 * the author's browser. `delete_article_comment` (migration 0009) checks the
 * token itself and reports false on a mismatch without touching the row, so a
 * caller can't use this to discover which comment ids exist.
 *
 * The delete is soft: the row stays so any replies underneath keep their
 * place, and the text is replaced with a placeholder on read.
 */
export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let token: string;
  try {
    const payload = (await request.json()) as { token?: unknown };
    if (typeof payload.token !== "string" || !payload.token) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    token = payload.token;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });

  const { data, error } = await supabase.rpc("delete_article_comment", {
    comment_id: id,
    token,
  });

  if (error) {
    console.error("[comments] delete failed", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // False means the token didn't match, or it was already deleted. Same
  // response either way — nothing here confirms the comment exists.
  if (data !== true) {
    return NextResponse.json({ ok: false, message: "Could not remove that comment." }, {
      status: 403,
    });
  }

  return NextResponse.json({ ok: true });
}
