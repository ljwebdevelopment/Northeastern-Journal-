import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site-config";

/**
 * Generated share card, replacing the placeholder stock image the site
 * previously pointed at. Rendered at build/request time by Next, so
 * there's no binary asset to keep in the repo.
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
          justifyContent: "center",
          background: "#8b1e1e",
          color: "#ffffff",
          padding: "80px",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            fontSize: 22,
            letterSpacing: 8,
            textTransform: "uppercase",
            opacity: 0.75,
          }}
        >
          Northeastern
        </div>
        <div style={{ fontSize: 104, fontWeight: 700, lineHeight: 1.05, marginTop: 8 }}>
          Journal
        </div>
        <div style={{ height: 6, width: 160, background: "#ffffff", opacity: 0.85, margin: "36px 0" }} />
        <div style={{ fontSize: 34, lineHeight: 1.3, maxWidth: 900, opacity: 0.92 }}>
          {siteConfig.tagline}
        </div>
      </div>
    ),
    size
  );
}
