"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  LayoutDashboard,
  Mail,
  PenSquare,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/supabase/types";

const items = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, adminOnly: false },
  { href: "/admin/articles", label: "Articles", icon: FileText, exact: false, adminOnly: false },
  { href: "/admin/articles/new", label: "Write", icon: PenSquare, exact: true, adminOnly: false },
  { href: "/admin/subscribers", label: "Subscribers", icon: Mail, exact: false, adminOnly: true },
  { href: "/admin/team", label: "Team", icon: Users, exact: false, adminOnly: true },
  { href: "/admin/settings", label: "Settings", icon: Settings, exact: false, adminOnly: true },
];

export function AdminNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const visible = items.filter((item) => !item.adminOnly || role === "admin");

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
