import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getSessionUser, canWrite } from "@/lib/auth/roles";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Editor Sign In",
  description: "Sign in to the Northeastern Journal newsroom.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destination = next && next.startsWith("/") ? next : "/admin";

  const user = await getSessionUser();
  if (user && canWrite(user.profile.role)) redirect(destination);

  return (
    <div className="content-container flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md">
        <div className="text-center">
          <p className="kicker">Northeastern Journal</p>
          <h1 className="mt-2 font-serif text-3xl font-bold">Newsroom Sign In</h1>
          <p className="mt-3 text-sm text-muted">
            Enter your email and we&apos;ll send you a secure sign-in link. No
            password to remember.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-surface p-6 card-shadow sm:p-8">
          {isSupabaseConfigured ? (
            <LoginForm next={destination} />
          ) : (
            <div className="text-sm leading-relaxed text-muted">
              <p className="font-semibold text-foreground">Setup required</p>
              <p className="mt-2">
                Supabase isn&apos;t connected yet. Add{" "}
                <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
                  NEXT_PUBLIC_SUPABASE_URL
                </code>{" "}
                and{" "}
                <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
                  NEXT_PUBLIC_SUPABASE_ANON_KEY
                </code>{" "}
                to your environment, then reload. See{" "}
                <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
                  docs/SETUP.md
                </code>
                .
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Newsroom access is limited to invited editors and contributors.{" "}
          <Link href="/contribute" className="text-accent hover:underline">
            Want to write for us?
          </Link>
        </p>
      </div>
    </div>
  );
}
