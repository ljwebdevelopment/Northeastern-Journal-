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

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteConfig.url, changeFrequency: "hourly", priority: 1 },
    { url: `${siteConfig.url}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteConfig.url}/cherokee-nana`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteConfig.url}/next-generation`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteConfig.url}/conversations`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteConfig.url}/books`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteConfig.url}/videos`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteConfig.url}/newsletter`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteConfig.url}/newsletter/archive`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${siteConfig.url}/search`, changeFrequency: "monthly", priority: 0.3 },
  ];

  return [
    ...staticRoutes,
    ...categories.map((c) => ({
      url: `${siteConfig.url}/category/${c.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...authors.map((a) => ({
      url: `${siteConfig.url}/author/${a.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...articles.map((a) => ({
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
