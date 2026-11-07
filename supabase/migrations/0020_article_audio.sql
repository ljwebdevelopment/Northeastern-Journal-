-- ---------------------------------------------------------------------------
-- 0020 — Listen: a narrated recording of each published article
-- ---------------------------------------------------------------------------
-- Recordings are made outside the app, by the "Article audio" GitHub Action
-- (.github/workflows/article-audio.yml), using the free, open-source Kokoro
-- voice model. It writes the MP3 to the public `audio` bucket and one row
-- here per article. The site only reads.
--
-- Kept in its own table rather than as columns on `articles` so the article
-- query never depends on this migration having run: if the table is missing,
-- the Listen button simply doesn't appear.

create table if not exists public.article_audio (
  article_id       uuid primary key references public.articles (id) on delete cascade,
  slug             text not null,
  audio_url        text not null,
  storage_path     text not null,
  duration_seconds numeric not null,
  voice            text not null,
  -- Hash of the narrated text + voice settings; the generator re-records
  -- only when this changes (an edit to the story, or a new voice).
  text_hash        text not null,
  -- [{ "block": <index of the paragraph in the body, -1 for the headline>,
  --    "start": <seconds> }], for follow-along highlighting.
  segments         jsonb not null default '[]'::jsonb,
  updated_at       timestamptz not null default now()
);

create index if not exists article_audio_slug_idx on public.article_audio (slug);

alter table public.article_audio enable row level security;

grant select on public.article_audio to anon, authenticated;

-- Anyone may read the recording of a published article; nothing else.
drop policy if exists "article audio public read" on public.article_audio;
create policy "article audio public read" on public.article_audio
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.articles a
      where a.id = article_audio.article_id and a.status = 'published'
    )
  );

-- Public bucket for the MP3s. Writes come only from the service role (the
-- GitHub Action), which bypasses RLS, so no insert/update policies are needed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audio', 'audio', true, 52428800, array['audio/mpeg'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "audio bucket public read" on storage.objects;
create policy "audio bucket public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'audio');
