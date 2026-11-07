# Listen: narrated articles

Every published article gets a **Listen** button that plays a recording in
the "Bella" voice from Kokoro, a free, open-source voice model. There are no
fees, accounts or API keys for the voice itself.

## How it works

1. The **Article audio** GitHub Action (`.github/workflows/article-audio.yml`)
   runs every 30 minutes.
2. It reads published articles from Supabase and records any that are new or
   have changed since their last recording
   (`scripts/audio/generate_article_audio.py`).
3. The MP3 goes to the public `audio` storage bucket and a row goes to
   `article_audio`.
4. The article page shows the Listen button once that row exists (within about
   5 minutes, because of page caching).

Edited stories are re-recorded automatically; unchanged ones are skipped.

## One-time setup

1. Run `supabase/migrations/0020_article_audio.sql` in the Supabase SQL editor.
2. In GitHub → Settings → Secrets and variables → Actions, add:
   - `SUPABASE_URL`: the same value as `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`: the same value as in Vercel
3. In GitHub → Actions → Article audio, click **Run workflow** to record the
   existing archive now instead of waiting.

## Changing the voice or speed

Edit `AUDIO_VOICE` / `AUDIO_SPEED` in the workflow, then run it with
**force** checked to re-record everything.
