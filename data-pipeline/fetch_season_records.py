"""
fetch_season_records.py

Fetch full-season win/loss records for every team in a bracket year from the
NCAA API standings endpoint, writing them to cache/season_records_<year>.json
for downstream consumption by build_dataset.py.

The API returns Overall W/L — full season including conference tournaments
AND the NCAA tournament. build_dataset.py subtracts tournament wins/losses
to derive pre_tournament_* fields for the performance_acceleration math.

Run:
  python fetch_season_records.py --year 2026
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import pandas as pd
import requests

from fetch_bracket import NAME_NORMALIZE

PIPELINE_DIR = Path(__file__).resolve().parent
CACHE_DIR = PIPELINE_DIR / "cache"

API_BASE = "https://ncaa-api.henrygd.me"
RATE_LIMIT_SLEEP = 0.25
REQUEST_TIMEOUT = 30


def fetch_standings_json(year: int, cache_path: Path) -> dict:
    if cache_path.exists():
        print(f"[cache] loading {cache_path.relative_to(PIPELINE_DIR)}")
        return json.loads(cache_path.read_text())
    url = f"{API_BASE}/standings/basketball-men/d1/{year}"
    print(f"[api] GET {url}")
    r = requests.get(url, timeout=REQUEST_TIMEOUT)
    r.raise_for_status()
    data = r.json()
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(data, indent=2))
    print(f"[cache] wrote {cache_path.relative_to(PIPELINE_DIR)}")
    time.sleep(RATE_LIMIT_SLEEP)
    return data


def parse_standings(data: dict) -> dict[str, dict[str, int]]:
    """
    Walk the per-conference 'standings' arrays and flatten into
    {canonical_team_name: {"overall_w": int, "overall_l": int}}.
    """
    out: dict[str, dict[str, int]] = {}
    for conf_block in data.get("data", []):
        for row in conf_block.get("standings", []):
            api_name = row["School"]
            canonical = NAME_NORMALIZE.get(api_name, api_name)
            out[canonical] = {
                "overall_w": int(row["Overall W"]),
                "overall_l": int(row["Overall L"]),
            }
    return out


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch overall season win/loss records for a tournament year."
    )
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument(
        "--output", type=Path, default=None,
        help="Output JSON path. Defaults to cache/season_records_<year>.json.",
    )
    args = parser.parse_args()

    year = args.year
    raw_cache = CACHE_DIR / f"ncaa_standings_{year}.json"
    output_path = args.output if args.output else CACHE_DIR / f"season_records_{year}.json"
    tournament_csv = PIPELINE_DIR / f"tournament_results_{year}.csv"

    raw = fetch_standings_json(year, raw_cache)
    records = parse_standings(raw)
    print(f"Parsed {len(records)} teams from standings.")

    if tournament_csv.exists():
        bracket_teams = [
            t for t in pd.read_csv(tournament_csv)["team"].tolist()
            if not t.startswith("First Four Loser")
        ]
        missing = [t for t in bracket_teams if t not in records]
        if missing:
            print(
                f"WARNING: {len(missing)} bracket team(s) missing from standings — "
                f"may need a NAME_NORMALIZE entry in fetch_bracket.py: {missing}"
            )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(records, indent=2, sort_keys=True))
    print(f"Wrote {len(records)} records to {output_path.relative_to(PIPELINE_DIR)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
