import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";
import {
  getArticles,
  getAuthors,
  getBooks,
  getCategories,
  getConversations,
  getNewsletterIssues,
  getVideos,
} from "@/lib/content/api";
import { demoContentConfig } from "@/lib/content/demo-config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, authors, categories, books, videos, conversations, issues] = await Promise.all([
    getArticles(),
    getAuthors(),
    getCategories(),
    getBooks(),
    getVideos(),
    getConversations(),
    getNewsletterIssues(),
  ]);

  // Only list collections that have something in them; the pages 404 when
  // empty, and a sitemap entry pointing at a 404 is a crawl error.
  const collectionRoutes: MetadataRoute.Sitemap = [
    ...(books.length > 0
      ? [{ url: `${siteConfig.url}/books`, changeFrequency: "weekly" as const, priority: 0.7 }]
      : []),
    ...(videos.length > 0
      ? [{ url: `${siteConfig.url}/videos`, changeFrequency: "weekly" as const, priority: 0.7 }]
      : []),
    ...(conversations.length > 0
      ? [{ url: `${siteConfig.url}/conversations`, changeFrequency: "weekly" as const, priority: 0.8 }]
      : []),
    ...(issues.length > 0
      ? [{ url: `${siteConfig.url}/newsletter/archive`, changeFrequency: "weekly" as const, priority: 0.5 }]
      : []),
  ];

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteConfig.url, changeFrequency: "hourly", priority: 1 },
    { url: `${siteConfig.url}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteConfig.url}/authors`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteConfig.url}/contribute`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteConfig.url}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteConfig.url}/cherokee-nana`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteConfig.url}/next-generation`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteConfig.url}/newsletter`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteConfig.url}/search`, changeFrequency: "monthly", priority: 0.3 },
  ];

  // Category pages 404 while empty, so only list the ones with articles.
  const usedCategories = new Set(articles.map((a) => a.category));

  return [
    ...staticRoutes,
    ...collectionRoutes,
    ...categories
      .filter((c) => usedCategories.has(c.slug))
      .map((c) => ({
        url: `${siteConfig.url}/category/${c.slug}`,
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
    ...authors.map((a) => ({
      url: `${siteConfig.url}/author/${a.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...articles
      .filter((a) => !a.isDemo || demoContentConfig.indexable)
      .map((a) => ({
        url: `${siteConfig.url}/article/${a.category}/${a.slug}`,
        lastModified: a.updatedAt ?? a.publishedAt,
        changeFrequency: "monthly" as const,
        priority: 0.8,
        images: [a.image],
      })),
    ...books.map((b) => ({
      url: `${siteConfig.url}/books/${b.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
      images: [b.cover],
    })),
    ...videos.map((v) => ({
      url: `${siteConfig.url}/videos/${v.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...conversations.map((c) => ({
      url: `${siteConfig.url}/conversations/${c.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...issues.map((i) => ({
      url: `${siteConfig.url}/newsletter/${i.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
