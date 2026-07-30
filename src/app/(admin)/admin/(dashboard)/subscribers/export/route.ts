import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/session";
import { listSubscribers } from "@/lib/store/subscribers";

/** CSV export of the subscriber list. Middleware gates `/admin/*`; the
 *  session is re-checked here because this route returns raw data. */
export async function GET() {
  const account = await getCurrentAccount();
  if (!account) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const subscribers = await listSubscribers();
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const rows = [
    ["email", "status", "subscribed_at", "updated_at", "unsubscribed_at", "source"],
    ...subscribers.map((s) => [
      s.email,
      s.status,
      s.subscribedAt,
      s.updatedAt,
      s.unsubscribedAt ?? "",
      s.source ?? "",
    ]),
  ];

  const csv = rows.map((row) => row.map((cell) => escape(String(cell))).join(",")).join("\n");
  const filename = `northeastern-journal-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
