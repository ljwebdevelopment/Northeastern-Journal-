import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSessionToken } from "@/lib/auth/session";

/**
 * Gates the dashboard at the edge. The signed session cookie is verified
 * here so unauthenticated requests never reach an admin page; each page
 * still re-checks the session and the account's permissions.
 *
 * `proxy.ts` is the Next.js 16 replacement for `middleware.ts`.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const email = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/admin/login") {
    if (email) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (!email) {
    const loginUrl = new URL("/admin/login", request.url);
    if (pathname !== "/admin") loginUrl.searchParams.set("next", `${pathname}${search}`);
    const response = NextResponse.redirect(loginUrl);
    // Clear an expired or tampered cookie so the login page starts clean.
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
