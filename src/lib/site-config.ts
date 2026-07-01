export const siteConfig = {
  name: "Northeastern Journal",
  tagline: "A Family Platform for Civic Writing & Generational Perspectives",
  description:
    "Northeastern Journal is a family platform dedicated to civic writing, thoughtful journalism, community discussion, and generational perspectives.",
  url: "https://northeasternjournal.com",
  ogImage: "https://picsum.photos/seed/nj-og/1200/630",
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
        { label: "Search", href: "/search" },
      ],
    },
  ],
};

export type SiteConfig = typeof siteConfig;
