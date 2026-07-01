import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: "NE Journal",
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f5",
    theme_color: "#8b1e1e",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
