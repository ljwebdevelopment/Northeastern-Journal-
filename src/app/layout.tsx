import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { siteConfig } from "@/lib/site-config";
import { socialImage, twitterMetadata } from "@/lib/social-image";
import { organizationJsonLd, websiteJsonLd } from "@/lib/jsonld";
import { buildFooterColumns, buildNav } from "@/lib/navigation";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
});

const defaultShareImage = socialImage(siteConfig.ogImage, `${siteConfig.name} — ${siteConfig.tagline}`);

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    images: [defaultShareImage],
  },
  twitter: twitterMetadata({
    title: siteConfig.name,
    description: siteConfig.description,
    image: defaultShareImage,
  }),
  alternates: {
    canonical: siteConfig.url,
    types: {
      "application/rss+xml": `${siteConfig.url}/rss.xml`,
      "application/atom+xml": `${siteConfig.url}/atom.xml`,
    },
  },
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#17110f" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [nav, footerColumns] = await Promise.all([buildNav(), buildFooterColumns()]);

  return (
    <html
      lang="en"
      className={`${inter.variable} ${sourceSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
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
        </ThemeProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationJsonLd(), websiteJsonLd()]),
          }}
        />
      </body>
    </html>
  );
}
