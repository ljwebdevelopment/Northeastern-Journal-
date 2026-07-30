import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "No Newsroom Access",
  robots: { index: false, follow: false },
};

export default async function NoAccessPage() {
  const user = await getSessionUser();

  return (
    <div className="content-container flex min-h-[60vh] items-center justify-center py-16">
      <div className="max-w-md text-center">
        <p className="kicker">Access</p>
        <h1 className="mt-2 font-serif text-3xl font-bold">
          You&apos;re signed in, but not on the masthead
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          {user?.email ? (
            <>
              <strong className="text-foreground">{user.email}</strong> doesn&apos;t
              have newsroom access yet.{" "}
            </>
          ) : null}
          An administrator can add you from the team page. If you were expecting
          access, ask Cheryl or Luke to send an invitation.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground"
          >
            Back to the Journal
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:border-brand hover:text-brand"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
