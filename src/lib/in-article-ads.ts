/**
 * Where in-article ads go inside a story's body HTML.
 *
 * Long stories get an ad between paragraphs; short ones get none. The rules
 * are deliberately light so the ads pay for the site without crowding it:
 *
 * - No ads at all under IN_ARTICLE_MIN_WORDS.
 * - The first ad sits after roughly FIRST_AD_AFTER words, then one more every
 *   WORDS_BETWEEN_ADS words, up to MAX_IN_ARTICLE_ADS.
 * - An ad never lands in the last KEEP_CLEAR_AT_END words, where the
 *   end-of-article unit already sits.
 * - Breaks only fall after a top-level paragraph, list, quote, figure or
 *   table — never inside one, and never straight after a heading.
 */
export const IN_ARTICLE_MIN_WORDS = 700;
const FIRST_AD_AFTER = 300;
const WORDS_BETWEEN_ADS = 600;
const MAX_IN_ARTICLE_ADS = 3;
const KEEP_CLEAR_AT_END = 200;

const VOID_TAGS = new Set(["br", "hr", "img"]);
const BREAK_AFTER = new Set(["p", "ul", "ol", "blockquote", "pre", "figure", "table"]);

function countWords(text: string): number {
  const t = text.replace(/&[a-z#0-9]+;/gi, " ").trim();
  return t ? t.split(/\s+/).length : 0;
}

/**
 * Splits sanitized article HTML into chunks, with an ad meant to go between
 * each pair. One chunk back means no ads for this story.
 */
export function splitForInArticleAds(html: string): string[] {
  const tagRe = /<(\/?)([a-zA-Z0-9]+)[^>]*>/g;

  // Walk the HTML once, noting each spot a break could go and how many words
  // come before it.
  const candidates: { index: number; wordsBefore: number }[] = [];
  let depth = 0;
  let words = 0;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = tagRe.exec(html))) {
    words += countWords(html.slice(last, m.index));
    last = tagRe.lastIndex;

    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    if (VOID_TAGS.has(tag)) continue;

    if (closing) {
      depth = Math.max(0, depth - 1);
      if (depth === 0 && BREAK_AFTER.has(tag)) {
        candidates.push({ index: tagRe.lastIndex, wordsBefore: words });
      }
    } else {
      depth++;
    }
  }
  words += countWords(html.slice(last));
  const total = words;

  if (total < IN_ARTICLE_MIN_WORDS) return [html];

  const breaks: number[] = [];
  let target = FIRST_AD_AFTER;
  for (const c of candidates) {
    if (breaks.length >= MAX_IN_ARTICLE_ADS) break;
    if (total - c.wordsBefore < KEEP_CLEAR_AT_END) break;
    if (c.wordsBefore >= target) {
      breaks.push(c.index);
      target = c.wordsBefore + WORDS_BETWEEN_ADS;
    }
  }

  if (breaks.length === 0) return [html];

  const chunks: string[] = [];
  let start = 0;
  for (const b of breaks) {
    chunks.push(html.slice(start, b));
    start = b;
  }
  chunks.push(html.slice(start));
  return chunks;
}
