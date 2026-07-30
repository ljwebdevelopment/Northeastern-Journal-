import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/env";

/**
 * One-click unsubscribe.
 *
 * GET  — a person clicked the footer link; unsubscribe and show a page.
 * POST — the mail client's RFC 8058 One-Click request (Gmail, Outlook, Apple
 *        Mail render a native "Unsubscribe" button when they see the
 *        List-Unsubscribe-Post header). Must answer 200 with no redirect.
 *
 * No confirmation step and no sign-in: making someone log in to stop receiving
 * email is exactly what CAN-SPAM forbids.
 */

export const runtime = "nodejs";

async function unsubscribe(token: string | null): Promise<boolean> {
  if (!token || !hasServiceRole) return false;

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("subscribers")
    .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .select("id");

  return !error && Boolean(data?.length);
}

export async function GET(request: NextRequest) {
  const ok = await unsubscribe(request.nextUrl.searchParams.get("token"));
  return NextResponse.redirect(
    `${request.nextUrl.origin}/newsletter/unsubscribed?status=${ok ? "done" : "invalid"}`
  );
}

export async function POST(request: NextRequest) {
  const ok = await unsubscribe(request.nextUrl.searchParams.get("token"));
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
