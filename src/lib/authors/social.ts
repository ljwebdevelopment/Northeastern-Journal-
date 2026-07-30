import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";
import { SubstackIcon, TikTokIcon, XIcon } from "@/components/icons/brand-icons";
import type { Author, SocialLinks, SocialPlatform } from "@/lib/content/types";

export interface SocialPlatformMeta {
  key: Exclude<SocialPlatform, "twitter">;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /** Shown as the field hint in the dashboard. */
  placeholder: string;
}

/** Display order for social icons, both on the profile and in the editor. */
export const socialPlatforms: SocialPlatformMeta[] = [
  { key: "facebook", label: "Facebook", icon: Facebook, placeholder: "https://facebook.com/yourpage" },
  { key: "instagram", label: "Instagram", icon: Instagram, placeholder: "https://instagram.com/yourhandle" },
  { key: "x", label: "X", icon: XIcon, placeholder: "https://x.com/yourhandle" },
  { key: "tiktok", label: "TikTok", icon: TikTokIcon, placeholder: "https://tiktok.com/@yourhandle" },
  { key: "substack", label: "Substack", icon: SubstackIcon, placeholder: "https://yourname.substack.com" },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin, placeholder: "https://linkedin.com/in/yourname" },
  { key: "youtube", label: "YouTube", icon: Youtube, placeholder: "https://youtube.com/@yourchannel" },
];

/** Resolves the legacy `twitter` key onto `x` so older records still render. */
export function resolveSocial(social: SocialLinks): SocialLinks {
  return { ...social, x: social.x || social.twitter };
}

export interface ResolvedSocialLink extends SocialPlatformMeta {
  href: string;
}

export function socialLinksFor(author: Author): ResolvedSocialLink[] {
  const social = resolveSocial(author.social ?? {});
  return socialPlatforms
    .map((platform) => ({ ...platform, href: social[platform.key] ?? "" }))
    .filter((platform): platform is ResolvedSocialLink => Boolean(platform.href));
}
