import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/env";
import { sendWelcomeEmail } from "@/lib/email/send";

/**
 * Double opt-in, step two. The link in the confirmation email lands here.
 * On success the subscriber becomes `confirmed` and gets the welcome email.
 */

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const origin = request.nextUrl.origin;
  const to = (status: string) =>
    NextResponse.redirect(`${origin}/newsletter/confirmed?status=${status}`);

  if (!token || !hasServiceRole) return to("invalid");

  const supabase = createAdminSupabase();

  const { data: subscriber } = await supabase
    .from("subscribers")
    .select("id, email, status, unsubscribe_token")
    .eq("confirm_token", token)
    .maybeSingle();

  if (!subscriber) return to("invalid");
  if (subscriber.status === "confirmed") return to("already");

  const { error } = await supabase
    .from("subscribers")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      unsubscribed_at: null,
    })
    .eq("id", subscriber.id);

  if (error) return to("error");

  // Best effort — a failed welcome email shouldn't undo the confirmation.
  const result = await sendWelcomeEmail(subscriber.email, subscriber.unsubscribe_token);
  if (!result.ok) console.error("[newsletter] welcome email failed:", result.message);

  return to("confirmed");
}
