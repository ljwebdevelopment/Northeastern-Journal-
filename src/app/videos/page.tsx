import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVideos } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { VideoCard } from "@/components/shared/video-card";

export const metadata: Metadata = {
  title: "Videos",
  description: "The Northeastern Journal video center: featured videos, categories, and playlists.",
  alternates: { canonical: `${siteConfig.url}/videos` },
};

export default async function VideosPage() {
  const videos = await getVideos();
  // Nothing published here yet — hide the page rather than show an empty one.
  if (videos.length === 0) notFound();
  const playlists = Array.from(new Set(videos.map((v) => v.playlist).filter(Boolean)));

  return (
    <div className="content-container py-10">
      <Breadcrumbs items={[{ name: "Videos", href: "/videos" }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            collectionPageJsonLd("Videos", "The Journal's video center.", `${siteConfig.url}/videos`),
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Videos", url: `${siteConfig.url}/videos` },
            ]),
          ]),
        }}
      />

      <header className="max-w-2xl">
        <p className="kicker">Video Center</p>
        <h1 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">Videos</h1>
        <p className="mt-3 text-base text-muted">
          Interviews, panel discussions, and Journal originals across every
          section of the publication.
        </p>
      </header>

      {playlists.map((playlist) => (
        <section key={playlist} className="mt-12">
          <h2 className="font-serif text-2xl font-bold">{playlist}</h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {videos
              .filter((v) => v.playlist === playlist)
              .map((v) => (
                <VideoCard key={v.slug} video={v} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
