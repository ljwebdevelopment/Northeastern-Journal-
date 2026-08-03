import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/roles";

/**
 * The subscriber list as CSV.
 *
 * A mailing list you cannot get out of the system is a mailing list you don't
 * own — this is the difference between using Supabase and being locked into
 * it. Runs as the signed-in user, so RLS decides what comes back; the
 * admin-only policy on `subscribers` is what makes the role check below
 * belt-and-braces rather than the only guard.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.profile.role !== "admin") {
    return NextResponse.json({ error: "Administrators only." }, { status: 403 });
  }

  const supabase = await createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("subscribers")
    .select("email, name, status, frequency, source, created_at, confirmed_at, unsubscribed_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const columns = [
    "email",
    "name",
    "status",
    "frequency",
    "source",
    "created_at",
    "confirmed_at",
    "unsubscribed_at",
  ] as const;

  const rows = [
    columns.join(","),
    ...(data ?? []).map((row) => columns.map((c) => csvCell(row[c])).join(",")),
  ];

  const today = new Date().toISOString().slice(0, 10);

  // The leading BOM is what makes Excel read this as UTF-8 rather than
  // mangling any name with an accent in it.
  return new NextResponse(`﻿${rows.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="subscribers-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Quotes a CSV value, and defuses formula injection.
 *
 * A cell beginning `=`, `+`, `-`, or `@` is executed as a formula when the
 * file is opened in Excel or Sheets. An address like `=HYPERLINK(...)` is a
 * real attack against whoever opens the export, so prefix those with a
 * single quote, which spreadsheets treat as "this is text".
 */
function csvCell(value: unknown): string {
  if (value == null) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
