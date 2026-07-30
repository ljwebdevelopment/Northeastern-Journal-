import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s | Journal Dashboard" },
  robots: { index: false, follow: false },
};

/** Dashboard shell — deliberately free of the public masthead and footer. */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-full flex-1 flex-col bg-surface-muted/40">{children}</div>;
}
