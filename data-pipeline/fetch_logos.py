"""
fetch_logos.py

Downloads team logo SVGs from the NCAA API into web/public/logos/.

Reads cache/seonames_<year>.json (produced by fetch_bracket.py) for the
canonical team → seoname slug mapping. Skips logos that already exist on
disk so re-runs are cheap. Logs and continues on 404; downstream
build_dataset.py decides logo_path based on what's actually present.

Run:
  python fetch_logos.py --year 2026
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import requests

PIPELINE_DIR = Path(__file__).resolve().parent
CACHE_DIR = PIPELINE_DIR / "cache"
REPO_ROOT = PIPELINE_DIR.parent
LOGOS_DIR = REPO_ROOT / "web" / "public" / "logos"

API_BASE = "https://ncaa-api.henrygd.me"
RATE_LIMIT_SLEEP = 0.25  # seconds between API calls
REQUEST_TIMEOUT = 30


def main() -> int:
    parser = argparse.ArgumentParser(description="Download team logo SVGs from the NCAA API.")
    parser.add_argument("--year", type=int, required=True, help="Tournament year (e.g. 2026).")
    args = parser.parse_args()

    seonames_path = CACHE_DIR / f"seonames_{args.year}.json"
    if not seonames_path.exists():
        raise SystemExit(
            f"ERROR: {seonames_path} not found. Run "
            f"`python fetch_bracket.py --year {args.year}` first."
        )

    seonames: dict[str, str] = json.loads(seonames_path.read_text())
    LOGOS_DIR.mkdir(parents=True, exist_ok=True)

    downloaded, skipped, missing = 0, 0, []
    for team, slug in sorted(seonames.items(), key=lambda kv: kv[1]):
        target = LOGOS_DIR / f"{slug}.svg"
        if target.exists():
            skipped += 1
            continue
        url = f"{API_BASE}/logo/{slug}.svg"
        try:
            r = requests.get(url, timeout=REQUEST_TIMEOUT)
        except requests.RequestException as e:
            print(f"  [error] {team} ({slug}): {type(e).__name__}: {e}")
            missing.append((team, slug, "request error"))
            continue
        if r.status_code == 404:
            print(f"  [404] {team} ({slug}): logo not on NCAA CDN")
            missing.append((team, slug, "404"))
            time.sleep(RATE_LIMIT_SLEEP)
            continue
        if r.status_code != 200:
            print(f"  [{r.status_code}] {team} ({slug}): unexpected status")
            missing.append((team, slug, f"HTTP {r.status_code}"))
            time.sleep(RATE_LIMIT_SLEEP)
            continue
        target.write_bytes(r.content)
        print(f"  [ok] {team} -> {slug}.svg ({len(r.content)} bytes)")
        downloaded += 1
        time.sleep(RATE_LIMIT_SLEEP)

    print()
    print(f"Downloaded: {downloaded}")
    print(f"Already cached: {skipped}")
    print(f"Missing: {len(missing)}")
    if missing:
        print()
        print("Teams without logos (build_dataset.py will set logo_path=null):")
        for team, slug, reason in missing:
            print(f"  {team} ({slug}): {reason}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
