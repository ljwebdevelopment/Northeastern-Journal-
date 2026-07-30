/**
 * RFC 8058 one-click unsubscribe endpoint. Mailbox providers POST here
 * when a reader taps the native "Unsubscribe" button, with no user
 * interaction beyond that tap — so the opt-out must be honored on the
 * POST itself, with no confirmation step.
 */
import { NextResponse, type NextRequest } from "next/server";
import { verifyEmailToken } from "@/lib/security/tokens";
import { setSubscriberStatus } from "@/lib/store/subscribers";

async function optOut(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const email = (searchParams.get("email") ?? "").trim().toLowerCase();
  const token = searchParams.get("token") ?? "";

  if (!email || !token || !(await verifyEmailToken(email, token))) {
    return NextResponse.json({ ok: false, error: "Invalid unsubscribe link." }, { status: 400 });
  }

  await setSubscriberStatus(email, "unsubscribed");
  return NextResponse.json({ ok: true, status: "unsubscribed" });
}

export async function POST(request: NextRequest) {
  return optOut(request);
}

/** Some clients follow the link with GET; redirect those to the page. */
export async function GET(request: NextRequest) {
  const url = new URL("/unsubscribe", request.url);
  url.search = request.nextUrl.search;
  return NextResponse.redirect(url);
}
