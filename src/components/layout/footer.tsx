import Link from "next/link";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import type { NavItem } from "@/lib/navigation";

export function Footer({
  columns,
}: {
  columns: { title: string; links: NavItem[] }[];
}) {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="content-container grid gap-10 py-14 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <p className="font-serif text-xl font-bold text-foreground">
            Northeastern <span className="text-accent">Journal</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            {siteConfig.tagline}
          </p>
          <div className="mt-5 flex gap-3">
            {[
              { href: siteConfig.links.twitter, icon: Twitter, label: "Twitter" },
              { href: siteConfig.links.facebook, icon: Facebook, label: "Facebook" },
              { href: siteConfig.links.instagram, icon: Instagram, label: "Instagram" },
              { href: siteConfig.links.youtube, icon: Youtube, label: "YouTube" },
            ].map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground/70 transition-colors hover:border-accent hover:text-accent"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h3 className="kicker">{col.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted transition-colors hover:text-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="content-container flex flex-col items-center justify-between gap-3 py-6 text-xs text-muted sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} {siteConfig.name}. A family
            platform for civic writing.
          </p>
          <div className="flex gap-4">
            <Link href="/about" className="hover:text-accent">
              About
            </Link>
            <Link href="/newsletter" className="hover:text-accent">
              Newsletter
            </Link>
            <Link href="/search" className="hover:text-accent">
              Search
            </Link>
            <Link href="/admin" className="hover:text-accent">
              Editor Login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
