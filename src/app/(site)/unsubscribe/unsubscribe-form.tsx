"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { unsubscribeAction } from "@/lib/newsletter/actions";
import { initialUnsubscribeState } from "@/lib/newsletter/state";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-70 sm:w-auto"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {pending ? "Unsubscribing…" : "Unsubscribe me"}
    </button>
  );
}

export function UnsubscribeForm({ email, token }: { email: string; token: string }) {
  const [state, formAction] = useActionState(unsubscribeAction, initialUnsubscribeState);

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-xl border border-border bg-surface p-6 text-left"
      >
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
        <div>
          <p className="font-serif text-lg font-bold">Unsubscribed</p>
          <p className="mt-1 text-sm text-muted">{state.message}</p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-xl border border-border bg-surface p-6 text-left">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-muted">
        You&rsquo;re about to stop receiving the Sunday Letter at{" "}
        <span className="font-semibold text-foreground">{email}</span>.
      </p>
      <div className="mt-5">
        <SubmitButton />
      </div>
      {state.status === "error" && (
        <p role="alert" className="mt-3 text-sm text-brand">
          {state.message}
        </p>
      )}
    </form>
  );
}
