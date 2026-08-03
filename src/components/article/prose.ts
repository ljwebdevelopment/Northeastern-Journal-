/**
 * The typographic treatment for article body HTML.
 *
 * Shared so the draft preview is a true preview: if this list and the live
 * article page ever drift, previewing stops telling you anything about how the
 * piece will actually read.
 */
export const ARTICLE_PROSE_CLASS = `prose prose-neutral dark:prose-invert mx-auto max-w-[38rem]
  prose-headings:font-serif prose-headings:tracking-tight
  prose-h2:mt-12 prose-h2:text-2xl prose-h3:text-xl
  prose-p:text-[1.0625rem] prose-p:leading-[1.75]
  prose-a:text-accent prose-a:underline-offset-2
  prose-blockquote:border-l-brand prose-blockquote:font-serif
  prose-blockquote:not-italic prose-blockquote:text-foreground
  prose-img:rounded-xl
  prose-figcaption:text-sm prose-figcaption:text-muted`;
