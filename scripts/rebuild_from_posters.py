#!/usr/bin/env python3
"""
Rebuild movies table from existing poster filenames using TMDB search.
- Parses filenames in public/posters (and public/thumbs for cross-check)
- Extracts title and year from patterns like "the-godfather-1972.jpg"
- Calls TMDB Search API with (title, year) to resolve tmdb_id
- Upserts into Supabase movies table using Service Role key

Requirements:
- python-dotenv, requests, tqdm

Env vars (in .env or shell):
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- TMDB_API_KEY

Usage:
  python3 scripts/rebuild_from_posters.py [--limit 500] [--dry-run]
"""

import os
import re
import json
import argparse
from typing import Optional, Tuple
import requests
from dotenv import load_dotenv
from tqdm import tqdm

load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
POSTERS_DIR = os.path.join(os.getcwd(), "public", "posters")
THUMBS_DIR = os.path.join(os.getcwd(), "public", "thumbs")

if not SUPABASE_URL or not SUPABASE_KEY or not TMDB_API_KEY:
    raise SystemExit("Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TMDB_API_KEY")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,return=minimal"
}

FILENAME_RE = re.compile(r"^(?P<slug>.+?)-(?P<year>\d{4})\.(?:jpg|jpeg|png)$", re.IGNORECASE)


def slug_to_title(slug: str) -> str:
    # reverse the slug: dashes to spaces, basic capitalization
    title = slug.replace("-", " ").strip()
    # don't over-capitalize; rely on TMDB matching
    return title


def parse_filename(name: str) -> Optional[Tuple[str, int]]:
    m = FILENAME_RE.match(name)
    if not m:
        return None
    slug = m.group("slug")
    year = int(m.group("year"))
    return slug_to_title(slug), year


def tmdb_search(title: str, year: Optional[int]) -> Optional[int]:
    params = {"api_key": TMDB_API_KEY, "query": title}
    if year:
        params["year"] = year
    r = requests.get("https://api.themoviedb.org/3/search/movie", params=params, timeout=15)
    if r.status_code != 200:
        return None
    data = r.json()
    results = data.get("results", [])
    if not results:
        return None
    # Prefer exact year match if available
    if year:
        for res in results:
            rd = res.get("release_date") or ""
            if rd[:4].isdigit() and int(rd[:4]) == year:
                return res.get("id")
    # fallback to top result
    return results[0].get("id")


def upsert_movie(tmdb_id: int, title: str, year: Optional[int], poster_name: str) -> bool:
    poster_url = f"/posters/{poster_name}"
    thumb_name = poster_name  # may or may not exist; keep same naming
    thumb_path = os.path.join(THUMBS_DIR, thumb_name)
    thumb_url = f"/thumbs/{thumb_name}" if os.path.exists(thumb_path) else None
    payload = [{
        "tmdb_id": tmdb_id,
        "title": title,
        "release_year": year,
        # Use local asset paths; can be swapped to full URLs later
        "poster_url": poster_url,
        "thumb_url": thumb_url,
        "cached_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "updated_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
    }]
    url = f"{SUPABASE_URL}/rest/v1/movies?on_conflict=tmdb_id"
    r = requests.post(url, headers=HEADERS, data=json.dumps(payload), timeout=20)
    return r.status_code in (200, 201, 204)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=100000, help="max files to process")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not os.path.isdir(POSTERS_DIR):
        raise SystemExit(f"Posters dir not found: {POSTERS_DIR}")

    files = [f for f in os.listdir(POSTERS_DIR) if not f.startswith(".")]
    files.sort()
    processed = 0
    matched = 0
    upserted = 0
    skipped = 0
    failed = 0
    unresolved = []

    print(f"Scanning {len(files)} poster files (limit {args.limit})…")
    for name in tqdm(files[:args.limit]):
        parsed = parse_filename(name)
        if not parsed:
            skipped += 1
            continue
        title, year = parsed
        tmdb_id = tmdb_search(title, year)
        if not tmdb_id:
            unresolved.append((title, year, name))
            failed += 1
            continue
        matched += 1
        if args.dry_run:
            processed += 1
            continue
        ok = upsert_movie(tmdb_id, title, year, name)
        if ok:
            upserted += 1
        else:
            failed += 1
        processed += 1

    print("\nSUMMARY")
    print(f"Processed: {processed}")
    print(f"Matched TMDB: {matched}")
    print(f"Upserted: {upserted}")
    print(f"Skipped (bad filename): {skipped}")
    print(f"Failed: {failed}")

    if unresolved:
        print("\nUnresolved (sample up to 20):")
        for t, y, n in unresolved[:20]:
            print(f"- {t} ({y}) :: {n}")

if __name__ == "__main__":
    main()
