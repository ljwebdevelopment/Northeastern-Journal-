import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site-config";

/**
 * Fallback social-share image for every page that doesn't set its own
 * `openGraph.images` (articles and authors override this with a real photo).
 * `siteConfig.ogImage` points at this route, so without it every share card
 * silently 404s.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;

export default function OpengraphImage() {
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
          background: "#faf8f5",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "10px",
            display: "flex",
            background: "linear-gradient(90deg, #8b1e1e, #a52a2a, #8b1e1e)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "#8b1e1e",
              color: "#ffffff",
              fontSize: "34px",
              fontWeight: 700,
            }}
          >
            NJ
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "28px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#8b1e1e",
            }}
          >
            Northeastern Journal
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: "980px" }}>
          <div
            style={{
              display: "flex",
              fontSize: "60px",
              fontWeight: 700,
              lineHeight: 1.1,
              color: "#1a1512",
            }}
          >
            Independent News for Northeastern Oklahoma
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "22px",
              fontSize: "26px",
              color: "#4a4038",
              fontFamily: "sans-serif",
            }}
          >
            Local reporting, civic accountability, culture, and community voices.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
