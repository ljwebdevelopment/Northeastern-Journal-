import type { NextConfig } from "next";

/**
 * Supabase Storage serves uploaded images from the project's own hostname, so
 * it has to be allowed explicitly. Derived from the env var rather than
 * hard-coded, so the same config works across projects and preview branches.
 */
const supabaseHostname = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  // Pin the workspace root. Without it Turbopack walks up and can pick a
  // lockfile outside the project.
  turbopack: {
    root: __dirname,
  },

  images: {
    remotePatterns: [
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      // Placeholder archive imagery, retired once the CMS is populated.
      { protocol: "https" as const, hostname: "picsum.photos" },
      { protocol: "https" as const, hostname: "img.youtube.com" },
    ],
    formats: ["image/avif", "image/webp"],
    // Article leads render at ~900px; everything else is cards and avatars.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [40, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  poweredByHeader: false,
  compress: true,

  async redirects() {
    return [
      {
        // The old "Family Perspectives" section is now "Generations".
        source: "/category/family-perspectives",
        destination: "/category/generations",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
