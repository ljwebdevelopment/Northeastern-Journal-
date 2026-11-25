/**
 * Google AdSense configuration.
 *
 * The publisher ID is public (it is printed in every page's HTML), so it is
 * safe to keep in code. Ad unit slot IDs come from env vars so placements can
 * be added or swapped in Vercel without a code change. A placement whose slot
 * ID is unset renders nothing in production — no empty boxes on the page.
 *
 * Create each unit in AdSense → Ads → By ad unit → Display ads, then copy the
 * `data-ad-slot` number into the matching variable.
 */
export const ADSENSE_CLIENT = "ca-pub-2360852530141366";

export const AD_SLOTS = {
  /** Tall skyscraper beside the article body. Desktop (≥1280px) only. */
  articleRail: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_RAIL,
  /** Responsive unit directly under the article body. */
  articleEnd: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_END,
  /**
   * AdSense "In-article" unit placed between paragraphs of long stories
   * (rules in lib/in-article-ads.ts). Create it under By ad unit →
   * In-article ads.
   */
  inArticle: process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE,
  /** Responsive banner between sections on the front page. */
  home: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME,
} as const;
