"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import type { NavItem } from "@/lib/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

const todayLabel = () =>
  new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export function Header({ nav }: { nav: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header data-site-header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="h-[3px] w-full bg-gradient-to-r from-brand via-accent to-brand" />

      <div className="hidden border-b border-border/70 bg-surface-muted/60 lg:block">
        <div className="content-container flex h-8 items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted">
          <span>{todayLabel()}</span>
          <span>{siteConfig.tagline}</span>
        </div>
      </div>

      <div className="content-container flex h-16 items-center justify-between gap-2 sm:h-20 lg:h-24">
        <Link href="/" className="flex min-w-0 shrink items-center gap-2 leading-none sm:gap-3">
          <Image
            src="/logo-mark.svg"
            alt=""
            width={40}
            height={40}
            className="h-7 w-7 shrink-0 sm:h-8 sm:w-8 lg:h-10 lg:w-10"
            priority
          />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-serif text-lg font-bold tracking-tight text-foreground sm:text-2xl lg:text-4xl">
              Northeastern <span className="text-brand">Journal</span>
            </span>
            <span className="mt-1 hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-muted sm:block">
              Independent &middot; Local &middot; Northeastern Oklahoma
            </span>
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden min-w-0 flex-1 flex-wrap items-center justify-center gap-x-5 gap-y-1 lg:flex xl:gap-x-6"
        >
          {nav.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative whitespace-nowrap py-1 text-[13px] font-semibold uppercase tracking-wide transition-colors",
                  active ? "text-brand" : "text-foreground/80 hover:text-brand"
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "absolute -bottom-1 left-0 h-[2px] w-full origin-left scale-x-0 bg-brand transition-transform duration-300 group-hover:scale-x-100",
                    active && "scale-x-100"
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link
            href="/search"
            aria-label="Search"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-brand hover:text-brand sm:h-9 sm:w-9"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </Link>
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <Link
            href="/newsletter"
            className="hidden rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition-opacity hover:opacity-90 lg:inline-block"
          >
            Subscribe
          </Link>
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-foreground sm:h-9 sm:w-9 lg:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <nav
        aria-label="Mobile primary"
        className={cn(
          "grid overflow-hidden border-t border-border transition-[grid-template-rows] duration-300 lg:hidden",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr] border-t-0"
        )}
      >
        <div className="min-h-0">
          <div className="content-container flex flex-col gap-1 py-3">
            {nav.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-2 py-2.5 text-sm font-semibold",
                    active ? "bg-surface-muted text-brand" : "text-foreground/85 hover:bg-surface-muted"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/newsletter"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-brand px-4 py-2.5 text-center text-sm font-semibold text-brand-foreground"
            >
              Subscribe
            </Link>
            <div className="mt-2 flex items-center justify-between rounded-md px-2 py-1.5 sm:hidden">
              <span className="text-sm font-medium text-muted">Appearance</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
