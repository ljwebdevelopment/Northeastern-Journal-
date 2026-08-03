import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionUser, isStaff } from "@/lib/auth/roles";
import { newsletterIssueEmail } from "@/lib/email/templates";
import { issueView, resolveIssue } from "@/lib/newsletter/issue";
import { unsubscribeUrlFor } from "@/lib/email/send";
import type { NewsletterIssueRow } from "@/lib/supabase/types";

/**
 * Renders an issue exactly as it will be delivered, for the composer's preview
 * pane.
 *
 * A route rather than a React component on purpose: the email is a full HTML
 * document with its own `<head>`, and the only honest way to preview one is to
 * serve the real bytes into an iframe. Anything React re-rendered would be a
 * lookalike, and the differences would show up in subscribers' inboxes rather
 * than here.
 *
 * Staff-only, `noindex`, and never cached — a draft issue is internal.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.profile.role)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = await createServerSupabase();
  if (!supabase) return new NextResponse("Supabase is not configured.", { status: 503 });

  const { id } = await params;
  const { data } = await supabase
    .from("newsletter_issues")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) return new NextResponse("Not found", { status: 404 });

  const issue = data as NewsletterIssueRow;
  const snapshot = await resolveIssue(supabase, issue);
  const mail = newsletterIssueEmail(
    issueView(issue, snapshot),
    // Points at a token that matches no subscriber, so a stray click in the
    // preview cannot unsubscribe anybody.
    unsubscribeUrlFor("preview-not-a-real-token")
  );

  return new NextResponse(mail.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
