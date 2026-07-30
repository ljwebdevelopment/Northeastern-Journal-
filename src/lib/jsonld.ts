import { siteConfig } from "./site-config";
import type { Article, Author, Book, Video } from "./content/types";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/icon.svg`,
    sameAs: Object.values(siteConfig.links),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.url}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function personJsonLd(author: Author) {
  const sameAs = [
    ...new Set([...Object.values(author.social ?? {}), author.website].filter(Boolean)),
  ];
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    jobTitle: author.role,
    description: author.bio,
    image: author.photo,
    url: `${siteConfig.url}/author/${author.slug}`,
    email: author.email,
    homeLocation: author.location ? { "@type": "Place", name: author.location } : undefined,
    worksFor: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
    sameAs,
    award: (author.professionalLinks ?? [])
      .filter((link) => link.kind === "award")
      .map((link) => [link.title, link.outlet].filter(Boolean).join(" — ")),
  };
}

export function articleJsonLd(article: Article, author?: Author) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.excerpt,
    image: [article.image],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    author: author
      ? { "@type": "Person", name: author.name, url: `${siteConfig.url}/author/${author.slug}` }
      : undefined,
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: { "@type": "ImageObject", url: `${siteConfig.url}/icon.svg` },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteConfig.url}/article/${article.category}/${article.slug}`,
    },
  };
}

export function collectionPageJsonLd(name: string, description: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url,
  };
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function videoJsonLd(video: Video) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.description,
    thumbnailUrl: [video.thumbnail],
    uploadDate: video.publishedAt,
    embedUrl: `https://www.youtube.com/embed/${video.youtubeId}`,
  };
}

export function bookJsonLd(book: Book, authorName?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title,
    author: authorName ? { "@type": "Person", name: authorName } : undefined,
    image: book.cover,
    description: book.synopsis,
    datePublished: book.publishedAt,
  };
}
