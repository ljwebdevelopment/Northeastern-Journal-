"""
Narrate published articles with the free, open-source Kokoro voice model
("Bella") for the article page's Listen button.

Run by .github/workflows/article-audio.yml. Reads the live site's sitemap and
article pages (no accounts or keys), records an MP3 only for articles that are
new or whose text changed, and saves them to public/audio/ with a timing
manifest at src/lib/content/article-audio.json.

Environment (all optional):
  SITE_URL       default https://www.northeasternjournal.com
  AUDIO_VOICE    Kokoro voice id (default af_bella)
  AUDIO_SPEED    speaking rate (default 1.0)
  MAX_ARTICLES   cap per run (default 40)
  FORCE          "1" to re-record everything
  KOKORO_MODEL, KOKORO_VOICES  paths to the model files

Local test of one story:
  python generate_article_audio.py --html-file story.html --title "Headline" --out story.mp3
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import urllib.request

import numpy as np
from bs4 import BeautifulSoup

VOICE = os.environ.get("AUDIO_VOICE", "af_bella")
SPEED = float(os.environ.get("AUDIO_SPEED", "1.0"))
SAMPLE_RATE = 24000
BITRATE_KBPS = 48

# Must match the selector and "innermost only" rule in listen-button.tsx, so
# that block N here is paragraph N on the page for follow-along highlighting.
BLOCK_TAGS = ["p", "h2", "h3", "h4", "li", "blockquote", "figcaption"]

PAUSE_AFTER_HEADLINE = 0.7
PAUSE_AFTER_HEADING = 0.55
PAUSE_AFTER_PARAGRAPH = 0.4

# Pronunciations the phonemizer gets wrong in news copy. Order matters.
REPLACEMENTS = [
    (r"\ba\.m\.", "A M"),
    (r"\bp\.m\.", "P M"),
    (r"\bJan\.", "January"), (r"\bFeb\.", "February"), (r"\bAug\.", "August"),
    (r"\bSept?\.", "September"), (r"\bOct\.", "October"), (r"\bNov\.", "November"),
    (r"\bDec\.", "December"),
    (r"\bDr\.", "Doctor"), (r"\bSt\.(?= [A-Z])", "Saint"), (r"\bMt\.", "Mount"),
    (r"\bSen\.", "Senator"), (r"\bRep\.", "Representative"), (r"\bGov\.", "Governor"),
    (r"\bU\.S\.", "U.S."), (r"\bOkla\.", "Oklahoma"),
    (r"\bNSU\b", "N S U"),
    (r"&", " and "),
    (r"[“”]", '"'), (r"[‘’]", "'"),
    (r"\s*[—–]\s*", ", "),
]


def normalize(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    for pattern, repl in REPLACEMENTS:
        text = re.sub(pattern, repl, text)
    return re.sub(r"\s+", " ", text).strip()


def body_blocks(html: str) -> list[tuple[int, str, str]]:
    """(block index, tag, text) for every readable block, in page order.

    Parsed with html5lib so the tree matches what a browser builds from the
    same HTML, keeping block indexes aligned with the page.
    """
    soup = BeautifulSoup(html or "", "html5lib")
    nodes = soup.find_all(BLOCK_TAGS)
    node_ids = {id(n) for n in nodes}
    leaves = [
        n for n in nodes
        if not any(id(d) in node_ids for d in n.find_all(BLOCK_TAGS))
    ]
    out = []
    for i, el in enumerate(leaves):
        text = el.get_text(" ", strip=True)
        if text:
            out.append((i, el.name, text))
    return out


def script_for(title: str, subtitle: str | None, html: str):
    """The narration as [(block, text, pause_after)]; block -1 is the headline."""
    parts = [(-1, title.rstrip(".") + ".", PAUSE_AFTER_HEADLINE if not subtitle else 0.45)]
    if subtitle:
        parts.append((-1, subtitle, PAUSE_AFTER_HEADLINE))
    for i, tag, text in body_blocks(html):
        pause = PAUSE_AFTER_HEADING if tag in ("h2", "h3", "h4") else PAUSE_AFTER_PARAGRAPH
        if tag in ("h2", "h3", "h4") and not re.search(r"[.!?:]$", text):
            text += "."
        parts.append((i, text, pause))
    return [(b, normalize(t), p) for b, t, p in parts if normalize(t)]


def narration_hash(parts) -> str:
    payload = json.dumps({"v": VOICE, "s": SPEED, "parts": parts, "rev": 1})
    return hashlib.sha256(payload.encode()).hexdigest()


_kokoro = None


def kokoro():
    global _kokoro
    if _kokoro is None:
        from kokoro_onnx import Kokoro

        _kokoro = Kokoro(
            os.environ.get("KOKORO_MODEL", "kokoro-v1.0.onnx"),
            os.environ.get("KOKORO_VOICES", "voices-v1.0.bin"),
        )
    return _kokoro


def synthesize(parts):
    """Returns (float32 samples, segments)."""
    pieces, segments, t = [], [], 0.0
    for block, text, pause in parts:
        audio, sr = kokoro().create(text, voice=VOICE, speed=SPEED, lang="en-us")
        assert sr == SAMPLE_RATE, sr
        if not segments or segments[-1]["block"] != block:
            segments.append({"block": block, "start": round(t, 2)})
        pieces.append(audio.astype(np.float32))
        pieces.append(np.zeros(int(pause * SAMPLE_RATE), dtype=np.float32))
        t += len(audio) / SAMPLE_RATE + pause
    return np.concatenate(pieces), segments


def to_mp3(samples: np.ndarray) -> bytes:
    import lameenc

    pcm = (np.clip(samples, -1.0, 1.0) * 32767).astype(np.int16).tobytes()
    enc = lameenc.Encoder()
    enc.set_bit_rate(BITRATE_KBPS)
    enc.set_in_sample_rate(SAMPLE_RATE)
    enc.set_channels(1)
    enc.set_quality(2)
    return enc.encode(pcm) + enc.flush()


# --- Live site -> files in the repo -------------------------------------------
#
# No accounts or keys: the script reads the public site exactly as a reader
# would (sitemap, then each article page), writes the MP3s to public/audio/
# and the timing manifest to src/lib/content/article-audio.json. The workflow
# commits both, and Vercel redeploys the site with the new recordings.

SITE = os.environ.get("SITE_URL", "https://www.northeasternjournal.com").rstrip("/")
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
AUDIO_DIR = os.path.join(REPO, "public", "audio")
MANIFEST = os.path.join(REPO, "src", "lib", "content", "article-audio.json")
UA = "NortheasternJournal-AudioBot/1.0 (+https://www.northeasternjournal.com)"


def get(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as res:
        return res.read().decode("utf-8", "replace")


def article_urls() -> list[str]:
    xml = get(f"{SITE}/sitemap.xml")
    locs = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", xml)
    return sorted({u for u in locs if re.search(r"/article/[^/]+/[^/]+/?$", u)})


def read_article(url: str):
    """(slug, title, body_html) from a live article page, or None."""
    soup = BeautifulSoup(get(url), "html5lib")
    body = soup.find(id="article-body")
    h1 = soup.find("h1")
    if not body or not h1:
        return None
    slug = url.rstrip("/").rsplit("/", 1)[-1]
    return slug, h1.get_text(" ", strip=True), body.decode_contents()


def run_site():
    force = os.environ.get("FORCE") == "1"
    limit = int(os.environ.get("MAX_ARTICLES", "40"))
    os.makedirs(AUDIO_DIR, exist_ok=True)
    try:
        manifest = json.load(open(MANIFEST, encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        manifest = {}

    urls = article_urls()
    print(f"{len(urls)} articles in the sitemap, {len(manifest)} already recorded.")
    if not urls:
        sys.exit("Found no articles in the sitemap; leaving everything as it is.")

    live, done = set(), 0
    for url in urls:
        try:
            got = read_article(url)
        except Exception as e:
            print(f"  skip {url}: {e}")
            # Keep any existing recording rather than delete it on a blip.
            live.add(url.rstrip("/").rsplit("/", 1)[-1])
            continue
        if not got:
            continue
        slug, title, html = got
        live.add(slug)
        parts = script_for(title, None, html)
        h = narration_hash(parts)
        old = manifest.get(slug)
        if old and old.get("hash") == h and not force:
            continue
        if done >= limit:
            print(f"Reached MAX_ARTICLES={limit}; the rest will be recorded on the next run.")
            break

        print(f"Recording: {slug} ({sum(len(t) for _, t, _ in parts)} chars)")
        samples, segments = synthesize(parts)
        mp3 = to_mp3(samples)
        # A new file name per version, so no browser or CDN serves a stale
        # recording of an edited story.
        name = f"{slug}-{h[:10]}.mp3"
        open(os.path.join(AUDIO_DIR, name), "wb").write(mp3)
        if old and old.get("file") != name:
            try:
                os.remove(os.path.join(AUDIO_DIR, old["file"]))
            except OSError:
                pass
        manifest[slug] = {
            "file": name,
            "duration": round(len(samples) / SAMPLE_RATE, 2),
            "hash": h,
            "segments": segments,
        }
        print(f"  -> {len(samples) / SAMPLE_RATE / 60:.1f} min, {len(mp3) / 1e6:.1f} MB")
        done += 1
        # Save as we go, so a timeout keeps the finished recordings.
        json.dump(dict(sorted(manifest.items())), open(MANIFEST, "w"), indent=1)

    # Unpublished or deleted stories: drop their recordings.
    for slug in [s for s in manifest if s not in live]:
        try:
            os.remove(os.path.join(AUDIO_DIR, manifest[slug]["file"]))
        except OSError:
            pass
        del manifest[slug]
        print(f"Removed recording for {slug} (no longer published).")

    json.dump(dict(sorted(manifest.items())), open(MANIFEST, "w"), indent=1)
    print(f"Done. Recorded {done} article(s).")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--html-file")
    ap.add_argument("--title", default="Test headline")
    ap.add_argument("--subtitle")
    ap.add_argument("--out", default="test.mp3")
    args = ap.parse_args()

    if args.html_file:
        html = open(args.html_file, encoding="utf-8").read()
        parts = script_for(args.title, args.subtitle, html)
        samples, segments = synthesize(parts)
        open(args.out, "wb").write(to_mp3(samples))
        print(json.dumps({"seconds": round(len(samples) / SAMPLE_RATE, 1), "segments": segments}))
    else:
        run_site()


if __name__ == "__main__":
    main()
