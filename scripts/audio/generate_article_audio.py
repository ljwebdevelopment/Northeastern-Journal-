"""
Narrate published articles with the free, open-source Kokoro voice model and
publish the recordings for the article page's Listen button.

Run by .github/workflows/article-audio.yml. For each published article it
builds the text a reader would hear (headline, subtitle, body), hashes it, and
records a new MP3 only when that hash differs from the one on file, so an
unchanged story is never re-recorded and an edited one always is.

Environment:
  SUPABASE_URL                 project URL
  SUPABASE_SERVICE_ROLE_KEY    service-role key (writes storage + table)
  KOKORO_MODEL, KOKORO_VOICES  paths to the model files
  AUDIO_VOICE                  Kokoro voice id (default af_bella)
  AUDIO_SPEED                  speaking rate (default 1.0)
  MAX_ARTICLES                 cap per run (default 25)
  FORCE                        "1" to re-record everything

Local test without Supabase:
  python generate_article_audio.py --html-file story.html --title "Headline" --out story.mp3
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone

import numpy as np
from bs4 import BeautifulSoup

VOICE = os.environ.get("AUDIO_VOICE", "af_bella")
SPEED = float(os.environ.get("AUDIO_SPEED", "1.0"))
SAMPLE_RATE = 24000
BITRATE_KBPS = 64

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


# --- Supabase (plain REST, no SDK) -------------------------------------------


class Supabase:
    def __init__(self, url: str, key: str):
        self.url = url.rstrip("/")
        self.key = key

    def _req(self, method, path, body=None, headers=None):
        h = {"apikey": self.key, "Authorization": f"Bearer {self.key}"}
        h.update(headers or {})
        req = urllib.request.Request(self.url + path, data=body, method=method, headers=h)
        with urllib.request.urlopen(req, timeout=120) as res:
            raw = res.read()
            return json.loads(raw) if raw and "json" in res.headers.get("content-type", "") else raw

    def select(self, table, query):
        return self._req("GET", f"/rest/v1/{table}?{query}")

    def upsert(self, table, row, conflict):
        return self._req(
            "POST",
            f"/rest/v1/{table}?on_conflict={conflict}",
            json.dumps(row).encode(),
            {"Content-Type": "application/json", "Prefer": "resolution=merge-duplicates"},
        )

    def upload(self, bucket, path, data, content_type):
        self._req(
            "POST",
            f"/storage/v1/object/{bucket}/{urllib.parse.quote(path)}",
            data,
            {"Content-Type": content_type, "x-upsert": "true", "cache-control": "31536000"},
        )
        return f"{self.url}/storage/v1/object/public/{bucket}/{urllib.parse.quote(path)}"

    def remove(self, bucket, path):
        try:
            self._req("DELETE", f"/storage/v1/object/{bucket}/{urllib.parse.quote(path)}")
        except Exception as e:  # an orphaned old file is harmless
            print(f"  (could not remove old {path}: {e})")


def run_supabase():
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        sys.exit("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (GitHub repository secrets).")
    db = Supabase(url, key)
    force = os.environ.get("FORCE") == "1"
    limit = int(os.environ.get("MAX_ARTICLES", "25"))

    articles = db.select(
        "articles",
        "select=id,slug,title,subtitle,body_html&status=eq.published&order=published_at.desc",
    )
    existing = {
        r["article_id"]: r
        for r in db.select("article_audio", "select=article_id,text_hash,storage_path")
    }
    print(f"{len(articles)} published articles, {len(existing)} already recorded.")

    done = 0
    for a in articles:
        parts = script_for(a["title"], a.get("subtitle"), a.get("body_html") or "")
        h = narration_hash(parts)
        old = existing.get(a["id"])
        if old and old["text_hash"] == h and not force:
            continue
        if done >= limit:
            print(f"Reached MAX_ARTICLES={limit}; the rest will be recorded on the next run.")
            break

        print(f"Recording: {a['slug']} ({sum(len(t) for _, t, _ in parts)} chars)")
        samples, segments = synthesize(parts)
        mp3 = to_mp3(samples)
        # A new file name per version, so browsers and the CDN never serve a
        # stale recording of an edited story.
        path = f"{a['slug']}-{h[:10]}.mp3"
        public_url = db.upload("audio", path, mp3, "audio/mpeg")
        db.upsert(
            "article_audio",
            {
                "article_id": a["id"],
                "slug": a["slug"],
                "audio_url": public_url,
                "storage_path": path,
                "duration_seconds": round(len(samples) / SAMPLE_RATE, 2),
                "voice": VOICE,
                "text_hash": h,
                "segments": segments,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            "article_id",
        )
        if old and old["storage_path"] != path:
            db.remove("audio", old["storage_path"])
        print(f"  -> {len(samples) / SAMPLE_RATE / 60:.1f} min, {len(mp3) / 1e6:.1f} MB")
        done += 1

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
        run_supabase()


if __name__ == "__main__":
    main()
