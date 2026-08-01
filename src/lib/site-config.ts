export const siteConfig = {
  name: "Northeastern Journal",
  tagline: "Independent News for Northeastern Oklahoma",
  shortTagline: "Independent Local Journalism",
  description:
    "Northeastern Journal is an independent newsroom covering northeastern Oklahoma — local reporting, civic accountability, culture, and community voices.",
  url: "https://www.northeasternjournal.com",
  ogImage: "https://www.northeasternjournal.com/opengraph-image",
  /**
   * The people who founded and operate the Journal. Rendered on the About
   * page and in the Organization JSON-LD. Contributors are stored in
   * Supabase (`authors`) and are intentionally *not* listed here — the
   * masthead grows without a code change.
   */
  founders: [
    { name: "Cheryl Leeds", role: "Co-Founder & Editor" },
    { name: "Luke Johnson", role: "Co-Founder & Publisher" },
  ],
  links: {
    twitter: "https://twitter.com/example",
    facebook: "https://facebook.com/example",
    instagram: "https://instagram.com/example",
    youtube: "https://youtube.com/@example",
  },
  /**
   * Fallback navigation, used only before anything is published. Every entry
   * must be a page that exists unconditionally — section pages 404 while
   * empty, so they can't appear here. The real nav is assembled at request
   * time from published sections; see `lib/navigation.ts`.
   */
  nav: [
    { label: "About", href: "/about" },
    { label: "Contributors", href: "/authors" },
    { label: "Newsletter", href: "/newsletter" },
    { label: "Contribute", href: "/contribute" },
  ],
  /**
   * Evergreen footer links only — every page here exists regardless of what
   * has been published. Sections and collections are appended at request
   * time by `buildFooterColumns`, which knows which ones have content.
   */
  footerColumns: [
    {
      title: "The Journal",
      links: [
        { label: "About", href: "/about" },
        { label: "Contributors", href: "/authors" },
        { label: "Cherokee Nana", href: "/cherokee-nana" },
        { label: "Next Generation", href: "/next-generation" },
        { label: "Newsletter", href: "/newsletter" },
      ],
    },
    {
      title: "More",
      links: [
        { label: "Write for Us", href: "/contribute" },
        { label: "Search", href: "/search" },
        { label: "Privacy", href: "/privacy" },
      ],
    },
  ],
};

export type SiteConfig = typeof siteConfig;
