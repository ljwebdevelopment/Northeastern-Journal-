import { siteConfig } from "@/lib/site-config";
import { emailToken } from "@/lib/security/tokens";

/** Absolute site origin, preferring the deployment URL when present. */
export function siteOrigin(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined);
  return (fromEnv ?? siteConfig.url).replace(/\/$/, "");
}

/**
 * Links for opting out. `page` is the human-facing confirmation screen;
 * `oneClick` is the RFC 8058 POST endpoint mailbox providers call.
 */
export async function unsubscribeUrls(email: string) {
  const token = await emailToken(email);
  const query = `email=${encodeURIComponent(email)}&token=${token}`;
  return {
    token,
    page: `${siteOrigin()}/unsubscribe?${query}`,
    oneClick: `${siteOrigin()}/api/newsletter/unsubscribe?${query}`,
  };
}
