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
  PenSquare,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isStaff } from "@/lib/auth/roles-shared";
import type { UserRole } from "@/lib/supabase/types";

/**
 * `access` mirrors the role model rather than a bag of booleans:
 *   all   — anyone who can write, contributors included
 *   staff — editors and administrators
 *   admin — administrators only
 */
type Access = "all" | "staff" | "admin";

const items: {
  href: string;
  label: string;
  icon: typeof FileText;
  exact: boolean;
  access: Access;
}[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, access: "all" },
  { href: "/admin/articles", label: "Articles", icon: FileText, exact: false, access: "all" },
  { href: "/admin/articles/new", label: "Write", icon: PenSquare, exact: true, access: "all" },
  { href: "/admin/review", label: "Review", icon: Inbox, exact: false, access: "all" },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays, exact: false, access: "all" },
  { href: "/admin/collections", label: "Collections", icon: Library, exact: false, access: "all" },
  { href: "/admin/media", label: "Media", icon: Images, exact: false, access: "all" },
  { href: "/admin/letters", label: "Letters", icon: MessageSquareQuote, exact: false, access: "staff" },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, exact: false, access: "staff" },
  { href: "/admin/profile", label: "Edit Profile", icon: UserCog, exact: false, access: "all" },
  { href: "/admin/subscribers", label: "Subscribers", icon: Mail, exact: false, access: "admin" },
  { href: "/admin/team", label: "Team", icon: Users, exact: false, access: "admin" },
  { href: "/admin/settings", label: "Settings", icon: Settings, exact: false, access: "admin" },
];

export function AdminNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const visible = items.filter(({ access }) =>
    access === "admin" ? role === "admin" : access === "staff" ? isStaff(role) : true
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
