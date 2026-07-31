"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyRound, LayoutDashboard, Mail, UserCog, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/profile", label: "Edit Profile", icon: UserCog },
  { href: "/admin/account", label: "Account & Password", icon: KeyRound },
  { href: "/admin/authors", label: "Authors", icon: Users, ownerOnly: true },
  { href: "/admin/subscribers", label: "Subscribers", icon: Mail },
];

export function AdminNav({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="flex flex-wrap gap-1 lg:flex-col">
      {items
        .filter((item) => !item.ownerOnly || isOwner)
        .map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand text-brand-foreground"
                  : "text-foreground/75 hover:bg-surface-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </Link>
          );
        })}
    </nav>
  );
}
