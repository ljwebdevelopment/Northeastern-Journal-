import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVideoBySlug, getVideos } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { socialImage, twitterMetadata } from "@/lib/social-image";
import { breadcrumbJsonLd, videoJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { VideoCard } from "@/components/shared/video-card";
import { formatDate } from "@/lib/utils";

export async function generateStaticParams() {
  const videos = await getVideos();
  return videos.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const video = await getVideoBySlug(slug);
  if (!video) return {};
  const url = `${siteConfig.url}/videos/${slug}`;
  const image = socialImage(video.thumbnail, video.title, { width: 1280, height: 720 });
  return {
    title: video.title,
    description: video.description,
    alternates: { canonical: url },
    openGraph: {
      type: "video.other",
      siteName: siteConfig.name,
      title: video.title,
      description: video.description,
      url,
      images: [image],
    },
    twitter: twitterMetadata({ title: video.title, description: video.description, image }),
  };
}

export default async function VideoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const video = await getVideoBySlug(slug);
  if (!video) notFound();

  const all = await getVideos();
  const more = all.filter((v) => v.slug !== slug && v.category === video.category).slice(0, 3);

  return (
    <div className="content-container py-10">
      <Breadcrumbs items={[{ name: "Videos", href: "/videos" }, { name: video.title, href: `/videos/${slug}` }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            videoJsonLd(video),
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Videos", url: `${siteConfig.url}/videos` },
              { name: video.title, url: `${siteConfig.url}/videos/${slug}` },
            ]),
          ]),
        }}
      />

      <div className="mx-auto max-w-3xl">
        <div className="aspect-video overflow-hidden rounded-2xl bg-black">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${video.youtubeId}`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {video.playlist && <p className="kicker mt-6">{video.playlist}</p>}
        <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">{video.title}</h1>
        <p className="mt-2 text-sm text-muted">
          <time dateTime={video.publishedAt}>{formatDate(video.publishedAt)}</time>
        </p>
        <p className="mt-4 text-base leading-relaxed text-foreground/90">{video.description}</p>
      </div>

      {more.length > 0 && (
        <section className="mx-auto mt-16 max-w-5xl border-t border-border pt-10">
          <h2 className="font-serif text-2xl font-bold">More in This Category</h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-3">
            {more.map((v) => (
              <VideoCard key={v.slug} video={v} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
