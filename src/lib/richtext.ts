/**
 * Rich-text helpers shared by the editor, the save path, and the renderer.
 *
 * Article bodies are stored as HTML. Only signed-in newsroom users can write
 * them, but "trusted author" is not a security model — a compromised or
 * careless account should not be able to inject script into every reader's
 * browser. So everything is run through `sanitizeArticleHtml` on the way into
 * the database, with a strict allowlist of the tags TipTap can actually
 * produce.
 */

const ALLOWED_TAGS = new Set([
  "p", "br", "hr",
  "h2", "h3", "h4",
  "strong", "b", "em", "i", "u", "s", "sub", "sup", "code",
  "ul", "ol", "li",
  "blockquote", "pre",
  "a", "img", "figure", "figcaption",
  "table", "thead", "tbody", "tr", "th", "td",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "title", "width", "height", "loading"]),
  th: new Set(["colspan", "rowspan"]),
  td: new Set(["colspan", "rowspan"]),
};

const SAFE_URL = /^(https?:\/\/|mailto:|\/|#)/i;

/**
 * Strips every tag and attribute outside the allowlist, drops dangerous URL
 * schemes, and forces `rel="noopener noreferrer"` on external links.
 *
 * Deliberately regex-based rather than DOM-based: this runs in server actions
 * and edge-adjacent code where pulling in jsdom would be a large cost for a
 * small allowlist.
 */
export function sanitizeArticleHtml(input: string): string {
  if (!input) return "";

  let html = input
    // Remove whole dangerous elements including their contents.
    .replace(/<(script|style|iframe|object|embed|form|link|meta)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form|link|meta)\b[^>]*\/?>/gi, "");

  html = html.replace(
    /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^<>]*)?)\/?>/g,
    (match, closing: string, rawTag: string, rawAttrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (closing) return `</${tag}>`;

      const allowed = ALLOWED_ATTRS[tag];
      const attrs: string[] = [];

      if (allowed && rawAttrs) {
        const attrRe = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
        let m: RegExpExecArray | null;
        while ((m = attrRe.exec(rawAttrs))) {
          const name = m[1].toLowerCase();
          const value = (m[3] ?? m[4] ?? "").trim();
          if (!allowed.has(name)) continue;
          if ((name === "href" || name === "src") && !SAFE_URL.test(value)) continue;
          attrs.push(`${name}="${escapeAttr(value)}"`);
        }
      }

      if (tag === "a") {
        const href = attrs.find((a) => a.startsWith("href="));
        if (!href) return "<a>";
        const external = /href="https?:\/\//i.test(href);
        if (external && !attrs.some((a) => a.startsWith("rel="))) {
          attrs.push('rel="noopener noreferrer"');
        }
      }

      const selfClosing = tag === "br" || tag === "hr" || tag === "img";
      return `<${tag}${attrs.length ? " " + attrs.join(" ") : ""}${selfClosing ? " /" : ""}>`;
    }
  );

  return html.trim();
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Plain text with tags removed and entities decoded — for excerpts and feeds. */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h[1-6]|li|blockquote|figcaption|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Paragraph array, for RSS/search/JSON-LD which prefer plain blocks. */
export function htmlToParagraphs(html: string): string[] {
  return htmlToText(html)
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** 220 wpm, rounded, minimum 1 — the same figure the editor previews. */
export function readingMinutesFor(html: string): number {
  return Math.max(1, Math.round(countWords(htmlToText(html)) / 220));
}

/** Auto-excerpt used when an editor leaves the excerpt field blank. */
export function autoExcerpt(html: string, maxChars = 200): string {
  const text = htmlToText(html).replace(/\s+/g, " ");
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : maxChars).trimEnd()}…`;
}

/**
 * URL-safe slug. Used for auto-generating article slugs from titles and for
 * normalizing tag names.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[‘’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
