import { siteConfig } from "./site-config";
import type { Article, Author, Book, Video } from "./content/types";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    // NewsMediaOrganization is the specific type Google expects from a news
    // publisher; it unlocks publisher rich results that plain Organization
    // does not.
    "@type": "NewsMediaOrganization",
    name: siteConfig.name,
    alternateName: "The Journal",
    url: siteConfig.url,
    logo: {
      "@type": "ImageObject",
      url: `${siteConfig.url}/icon.svg`,
    },
    description: siteConfig.description,
    areaServed: {
      "@type": "AdministrativeArea",
      name: "Northeastern Oklahoma",
    },
    founder: siteConfig.founders.map((person) => ({
      "@type": "Person",
      name: person.name,
      jobTitle: person.role,
    })),
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
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    jobTitle: author.role,
    description: author.bio,
    image: author.photo,
    url: `${siteConfig.url}/author/${author.slug}`,
    sameAs: Object.values(author.social).filter(Boolean),
  };
}

export function articleJsonLd(article: Article, author?: Author) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title.slice(0, 110), // Google truncates past 110 chars
    alternativeHeadline: article.subtitle,
    description: article.metaDescription || article.excerpt,
    image: [article.image],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    articleSection: article.category,
    keywords: article.tags.join(", "),
    wordCount: article.wordCount,
    inLanguage: "en-US",
    isAccessibleForFree: true,
    author: author
      ? { "@type": "Person", name: author.name, url: `${siteConfig.url}/author/${author.slug}` }
      : { "@type": "Organization", name: siteConfig.name },
    publisher: {
      "@type": "NewsMediaOrganization",
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
