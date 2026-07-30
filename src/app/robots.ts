import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/search",
        "/admin",
        "/login",
        "/auth",
        "/api",
        // Subscription result pages are per-visitor and carry tokens.
        "/newsletter/confirmed",
        "/newsletter/unsubscribed",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
