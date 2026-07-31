export const siteConfig = {
  name: "Northeastern Journal",
  tagline: "A Family Platform for Civic Writing & Generational Perspectives",
  description:
    "Northeastern Journal is a family platform dedicated to civic writing, thoughtful journalism, community discussion, and generational perspectives.",
  url: "https://northeasternjournal.com",
  ogImage: "/opengraph-image",
  /**
   * Publisher identity used in newsletter emails. CAN-SPAM requires every
   * commercial message to carry a valid physical postal address, so this
   * is rendered in the footer of every send. Override in production with
   * `NEWSLETTER_POSTAL_ADDRESS` / `NEWSLETTER_CONTACT_EMAIL`.
   */
  publisher: {
    legalName: "Northeastern Journal",
    postalAddress:
      process.env.NEWSLETTER_POSTAL_ADDRESS ??
      "Northeastern Journal, PO Box 000, Your City, ST 00000",
    contactEmail:
      process.env.NEWSLETTER_CONTACT_EMAIL ?? "hello@northeasternjournal.com",
  },
  links: {
    twitter: "https://twitter.com/example",
    facebook: "https://facebook.com/example",
    instagram: "https://instagram.com/example",
    youtube: "https://youtube.com/@example",
  },
  /**
   * Fallback navigation, used only before anything is published. The real
   * header nav is assembled at request time from sections that actually
   * contain articles — see `buildNav` in `lib/navigation.ts`.
   */
  nav: [
    { label: "About", href: "/about" },
    { label: "Contributors", href: "/authors" },
    { label: "Newsletter", href: "/newsletter" },
  ],
  /**
   * Evergreen footer links. Section links are appended at request time
   * from whatever has been published.
   */
  footerColumns: [
    {
      title: "The Journal",
      links: [
        { label: "About", href: "/about" },
        { label: "Contributors", href: "/authors" },
        { label: "Next Generation", href: "/next-generation" },
        { label: "Newsletter", href: "/newsletter" },
        { label: "Search", href: "/search" },
      ],
    },
  ],
};

export type SiteConfig = typeof siteConfig;
