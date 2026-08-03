import Link from "next/link";
import { COLLECTIONS, COLLECTION_TYPES } from "@/app/admin/collections/schema";
import { cn } from "@/lib/utils";

/** Switches between the four collections. Shown on both the list and editor. */
export function CollectionTabs({ active }: { active: string }) {
  return (
    <nav className="flex flex-wrap gap-1" aria-label="Collections">
      {COLLECTION_TYPES.map((type) => (
        <Link
          key={type}
          href={`/admin/collections/${type}`}
          aria-current={active === type ? "page" : undefined}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
            active === type
              ? "bg-brand text-brand-foreground"
              : "text-muted hover:bg-surface-muted"
          )}
        >
          {COLLECTIONS[type].label}
        </Link>
      ))}
    </nav>
  );
}
