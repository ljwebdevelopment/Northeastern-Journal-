import Image from "next/image";
import Link from "next/link";
import { PlayCircle } from "lucide-react";
import type { Video } from "@/lib/content/types";

export function VideoCard({ video }: { video: Video }) {
  return (
    <article className="group flex flex-col">
      <Link
        href={`/videos/${video.slug}`}
        className="relative block aspect-video overflow-hidden rounded-lg bg-surface-muted"
      >
        <Image
          src={video.thumbnail}
          alt={video.title}
          fill
          sizes="(min-width: 1024px) 25vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
          <PlayCircle className="h-10 w-10 text-white drop-shadow" aria-hidden="true" />
        </div>
      </Link>
      {video.playlist && <p className="kicker mt-3">{video.playlist}</p>}
      <h3 className="mt-1 font-serif text-base font-bold leading-snug">
        <Link href={`/videos/${video.slug}`} className="hover:text-accent">
          {video.title}
        </Link>
      </h3>
    </article>
  );
}
