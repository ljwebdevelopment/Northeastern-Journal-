import { ImageResponse } from "next/og";
import { getArticleBySlug, getAuthorBySlug, getCategory } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { formatDate } from "@/lib/utils";

/**
 * Per-article share card, used when the story has no usable photo of its own.
 *
 * Without this the fallback was the site-wide card — the same "Independent
 * News for Northeastern Oklahoma" image on every link, which is what makes a
 * shared story look like a shared homepage. Every article now gets a card
 * carrying its own headline, section, and byline, so a link is identifiable
 * even before it's clicked.
 *
 * Every platform involved (X, Facebook, Bluesky, Substack, LinkedIn) reads
 * this through `og:image`, so one generated PNG serves all of them.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${siteConfig.name} article`;

const BRAND = "#8b1e1e";
const INK = "#1a1512";
const PAPER = "#faf8f5";

/** Long headlines have to shrink or they overflow the card. */
function headlineSize(title: string): number {
  if (title.length > 110) return 44;
  if (title.length > 70) return 54;
  return 66;
}

export default async function ArticleOpengraphImage({
  params,
}: {
  // Next passes a plain object here on some versions and a promise on others;
  // awaiting handles both.
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category: categorySlug, slug } = await params;
  const article = await getArticleBySlug(slug);
  const [author, category] = await Promise.all([
    article ? getAuthorBySlug(article.authorSlug) : Promise.resolve(undefined),
    getCategory(article?.category ?? categorySlug),
  ]);

  // The route has to render something even when the lookup fails, or the
  // card 500s and the platform shows nothing at all.
  const title = article?.title ?? siteConfig.tagline;
  const kicker = category?.name ?? siteConfig.name;
  const byline = [
    author?.name ? `By ${author.name}` : null,
    article?.publishedAt ? formatDate(article.publishedAt) : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: PAPER,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "12px",
            display: "flex",
            background: BRAND,
          }}
        />

        {/* Masthead */}
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "58px",
              height: "58px",
              borderRadius: "14px",
              background: BRAND,
              color: "#ffffff",
              fontSize: "30px",
              fontWeight: 700,
            }}
          >
            NJ
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "24px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: BRAND,
            }}
          >
            {siteConfig.name}
          </div>
        </div>

        {/* Headline block */}
        <div style={{ display: "flex", flexDirection: "column", maxWidth: "1010px" }}>
          <div
            style={{
              display: "flex",
              fontSize: "22px",
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: BRAND,
            }}
          >
            {kicker}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "18px",
              fontSize: headlineSize(title),
              fontWeight: 700,
              lineHeight: 1.12,
              color: INK,
            }}
          >
            {title}
          </div>
        </div>

        {/* Byline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `2px solid ${BRAND}22`,
            paddingTop: "22px",
            fontSize: "24px",
            color: "#4a4038",
          }}
        >
          <div style={{ display: "flex" }}>{byline}</div>
          <div style={{ display: "flex", fontWeight: 600, color: BRAND }}>
            northeasternjournal.com
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
