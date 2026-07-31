import { getArticles } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-static";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const articles = await getArticles();
  const updated = articles[0]?.publishedAt ?? new Date().toISOString();

  const entries = articles
    .slice(0, 30)
    .map((a) => {
      const url = `${siteConfig.url}/article/${a.category}/${a.slug}`;
      return `
  <entry>
    <title>${escapeXml(a.title)}</title>
    <link href="${url}"/>
    <id>${url}</id>
    <updated>${new Date(a.publishedAt).toISOString()}</updated>
    <summary>${escapeXml(a.excerpt)}</summary>
  </entry>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(siteConfig.name)}</title>
  <link href="${siteConfig.url}/atom.xml" rel="self"/>
  <link href="${siteConfig.url}"/>
  <id>${siteConfig.url}/</id>
  <updated>${new Date(updated).toISOString()}</updated>${entries}
</feed>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/atom+xml; charset=utf-8" },
  });
}
