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
  nav: [
    { label: "Politics", href: "/category/politics" },
    { label: "Community", href: "/category/community" },
    { label: "Culture", href: "/category/culture" },
    { label: "Opinion", href: "/category/opinion" },
    { label: "Cherokee Nana", href: "/cherokee-nana" },
    { label: "Next Generation", href: "/next-generation" },
    { label: "Conversations", href: "/conversations" },
    { label: "Books", href: "/books" },
    { label: "Videos", href: "/videos" },
  ],
  footerColumns: [
    {
      title: "Sections",
      links: [
        { label: "Local News", href: "/category/local-news" },
        { label: "National News", href: "/category/national-news" },
        { label: "World News", href: "/category/world-news" },
        { label: "Editorial", href: "/category/editorial" },
        { label: "Interviews", href: "/category/interviews" },
        { label: "Events", href: "/category/events" },
      ],
    },
    {
      title: "The Journal",
      links: [
        { label: "About", href: "/about" },
        { label: "Cherokee Nana", href: "/cherokee-nana" },
        { label: "Next Generation", href: "/next-generation" },
        { label: "Conversations", href: "/conversations" },
        { label: "Newsletter", href: "/newsletter" },
      ],
    },
    {
      title: "More",
      links: [
        { label: "Books", href: "/books" },
        { label: "Videos", href: "/videos" },
        { label: "Community Voices", href: "/category/community-voices" },
        { label: "Write for Us", href: "/contribute" },
        { label: "Search", href: "/search" },
      ],
    },
  ],
};

export type SiteConfig = typeof siteConfig;
