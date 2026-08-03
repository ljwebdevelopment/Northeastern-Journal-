"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  FileText,
  Images,
  Inbox,
  LayoutDashboard,
  Library,
  Mail,
  MessageSquareQuote,
  Newspaper,
  PenSquare,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isStaff } from "@/lib/auth/roles-shared";
import type { UserRole } from "@/lib/supabase/types";

/**
 * `staffOnly` hides an item from contributors; `adminOnly` narrows it further
 * to administrators. The routes enforce the same thing server-side — this only
 * keeps the sidebar honest about where a link would actually lead.
 *
 * Order follows the working day: what you write, then what's waiting on you,
 * then the things you maintain, then administration.
 */
const items: {
  href: string;
  label: string;
  icon: typeof FileText;
  exact: boolean;
  staffOnly?: boolean;
  adminOnly?: boolean;
}[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/articles", label: "Articles", icon: FileText, exact: false },
  { href: "/admin/articles/new", label: "Write", icon: PenSquare, exact: true },
  { href: "/admin/review", label: "Review", icon: Inbox, exact: false },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays, exact: false },
  { href: "/admin/collections", label: "Collections", icon: Library, exact: false },
  { href: "/admin/media", label: "Media", icon: Images, exact: false },
  { href: "/admin/letters", label: "Letters", icon: MessageSquareQuote, exact: false, staffOnly: true },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, exact: false, staffOnly: true },
  { href: "/admin/newsletter", label: "Newsletter", icon: Newspaper, exact: false, staffOnly: true },
  { href: "/admin/profile", label: "Edit Profile", icon: UserCog, exact: false },
  { href: "/admin/subscribers", label: "Subscribers", icon: Mail, exact: false, adminOnly: true },
  { href: "/admin/team", label: "Team", icon: Users, exact: false, adminOnly: true },
  { href: "/admin/settings", label: "Settings", icon: Settings, exact: false, adminOnly: true },
];

export function AdminNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const visible = items.filter(
    (item) => (!item.adminOnly || role === "admin") && (!item.staffOnly || isStaff(role))
  );

  return (
    <nav aria-label="Newsroom" className="mt-6 flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {visible.map(({ href, label, icon: Icon, exact }) => {
        const active = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand/10 text-brand"
                : "text-foreground/75 hover:bg-surface-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
