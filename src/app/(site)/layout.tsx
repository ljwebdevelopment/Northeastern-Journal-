import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { buildFooterColumns, buildNav } from "@/lib/navigation";

/**
 * Public site chrome. The admin dashboard lives in its own route group
 * with a different shell, so it doesn't inherit the masthead and footer.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [nav, footerColumns] = await Promise.all([buildNav(), buildFooterColumns()]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-foreground"
      >
        Skip to content
      </a>
      <Header nav={nav} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer columns={footerColumns} />
    </div>
  );
}
