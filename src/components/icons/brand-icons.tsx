/**
 * Brand marks Lucide doesn't ship. Same props as a Lucide icon; inherits
 * `currentColor`.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function XIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function TikTokIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-1.83-2.48V9.77a5.72 5.72 0 1 0 4.92 5.66V9.01a7.35 7.35 0 0 0 4.29 1.38V7.3a4.29 4.29 0 0 1-3.23-1.48z" />
    </svg>
  );
}

export function BlueskyIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M5.77 3.53C8.31 5.44 11.05 9.31 12 11.39c.95-2.08 3.69-5.95 6.23-7.86C20.06 2.15 23 1.09 23 4.44c0 .67-.38 5.62-.61 6.42-.78 2.8-3.63 3.51-6.17 3.08 4.43.75 5.56 3.25 3.12 5.75-4.62 4.75-6.64-1.19-7.16-2.71-.1-.28-.14-.41-.14-.3 0-.11-.05.02-.14.3-.52 1.52-2.54 7.46-7.16 2.71-2.43-2.5-1.31-5 3.12-5.75-2.54.43-5.39-.28-6.17-3.08C1.38 10.06 1 5.11 1 4.44c0-3.35 2.94-2.29 4.77-.91z" />
    </svg>
  );
}

export function SubstackIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.4 3.6H3.6V6h16.8zm0 4.8H3.6v2.4h16.8zM3.6 12.6V21l8.4-4.2 8.4 4.2v-8.4z" />
    </svg>
  );
}
