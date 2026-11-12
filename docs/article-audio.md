# Listen: narrated articles

Every published article gets a **Listen** button that plays a recording in
the "Bella" voice from Kokoro, a free, open-source voice model. No accounts,
keys or setup.

## How it works

1. The **Article audio** GitHub Action (`.github/workflows/article-audio.yml`)
   runs on every push to `main`, every 30 minutes, and on demand.
2. It reads the live site's sitemap and article pages, and records any article
   that is new or whose text changed (`scripts/audio/generate_article_audio.py`).
3. It commits the MP3s to `public/audio/` and the timings to
   `src/lib/content/article-audio.json`.
4. Vercel redeploys on that commit, and the Listen button appears.

A newly published story gets its Listen button within about 30–40 minutes.
Edited stories are re-recorded automatically; unpublished ones are removed.

## Changing the voice or speed

Edit `AUDIO_VOICE` / `AUDIO_SPEED` in the workflow, then run it from
Actions → Article audio → Run workflow with **force** checked.
