import { cn } from "@/lib/utils";
import type { ArticleStatus } from "@/lib/supabase/types";

/**
 * Its own module rather than living in the editor: the preview page and the
 * article list both want the badge, and neither should have to pull the whole
 * client-side editor bundle in to get it.
 */
export function StatusBadge({
  status,
  scheduledFor,
}: {
  status: ArticleStatus;
  scheduledFor?: string | null;
}) {
  const styles: Record<ArticleStatus, string> = {
    published: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
    scheduled: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    in_review: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
    draft: "bg-surface-muted text-muted",
    archived: "bg-surface-muted text-muted line-through",
  };

  const label =
    status === "scheduled" && scheduledFor
      ? `Scheduled · ${new Date(scheduledFor).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}`
      : status === "in_review"
        ? "In review"
        : status[0].toUpperCase() + status.slice(1);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        styles[status]
      )}
    >
      {label}
    </span>
  );
}
