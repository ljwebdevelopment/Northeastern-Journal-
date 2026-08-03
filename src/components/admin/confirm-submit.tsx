"use client";

/**
 * Submit button that asks first. Used for destructive actions in the article
 * list and team page, where a stray click would otherwise be irreversible.
 *
 * Falls back to submitting normally if JavaScript is unavailable — the server
 * action is still permission-checked, so nothing unsafe gets through.
 */
export function ConfirmSubmit({
  message,
  children,
  className,
  disabled,
  title,
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      disabled={disabled}
      title={title}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
