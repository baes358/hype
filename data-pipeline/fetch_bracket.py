"""
fetch_bracket.py

Canonical source for tournament_results_<year>.csv across all years.

2026 was originally transcribed manually from bracket coverage; that
hand-authored version is preserved in git history. API cross-validation on
2026-05-03 surfaced three First Four win-count discrepancies (Howard,
Miami (OH), Prairie View A&M — all FF winners that lost in R64), corrected
by adopting the API's uniform isWinner: true counting. The 2026 CSV was
then regenerated from the API output to deprecate the manual path.

See CLAUDE.md "First Four win counting" for the convention and
"Open follow-ups" for the name-normalization map maintenance note.

Run:
  python fetch_bracket.py --year 2026                     # writes tournament_results_2026.csv
  python fetch_bracket.py --year 2025 --output /tmp/x.csv # writes to alternate path (for diffing)
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import date, datetime, timedelta
from pathlib import Path

import pandas as pd
import requests

PIPELINE_DIR = Path(__file__).resolve().parent
CACHE_DIR = PIPELINE_DIR / "cache"

API_BASE = "https://ncaa-api.henrygd.me"
RATE_LIMIT_SLEEP = 0.25  # seconds between API calls (per API docs: 5 req/sec)
REQUEST_TIMEOUT = 30

# Hype window formula: (Selection Sunday − N days) to (Selection Sunday + M days),
# 15 days inclusive. Captures pre-bracket-reveal hype build-up + Selection Sunday
# peak + the First Four / R64 / R32 weekend + early Sweet 16 prep. Matches the
# 2025 window exactly; 2026 predates this formula and uses an earlier window
# (see CLAUDE.md "Open follow-ups").
SS_OFFSET_BEFORE = 5
SS_OFFSET_AFTER = 9
WINDOW_DAYS = SS_OFFSET_BEFORE + 1 + SS_OFFSET_AFTER  # 15 — must match WINDOW_DAYS_INCLUSIVE in pull_trends.py / build_dataset.py

# sectionId encoding observed in NCAA API responses:
#   1 = First Four (region inherited from winner's destination bracket position)
#   2 = East, 3 = West, 4 = South, 5 = Midwest
#   6 = Final Four / Championship (region already set from regional games — skip)
SECTION_TO_REGION: dict[int, str] = {2: "East", 3: "West", 4: "South", 5: "Midwest"}

# API nameShort → canonical CSV team name. The API uses current school
# branding; we keep historical CSV form to preserve TEAM_QUERY_MAP keys.
# See CLAUDE.md "Open follow-ups" — this map needs maintenance over time
# as schools rebrand.
NAME_NORMALIZE: dict[str, str] = {
    # Added 2026-05-03 (initial 2026 fetch validation)
    "Iowa St.": "Iowa State",
    "Kennesaw St.": "Kennesaw State",
    "McNeese": "McNeese State",
    "Miami (Ohio)": "Miami (OH)",
    "Michigan St.": "Michigan State",
    "North Dakota St.": "North Dakota State",
    "Ohio St.": "Ohio State",
    "Queens (N.C.)": "Queens",
    "Saint Mary's": "St. Mary's",
    "Tennessee St.": "Tennessee State",
    "Utah St.": "Utah State",
    "Wright St.": "Wright State",
    # Added 2026-05-03 (2025 fetch — additional St. → State abbreviations)
    "Alabama St.": "Alabama State",
    "Colorado St.": "Colorado State",
    "Mississippi St.": "Mississippi State",
    "Norfolk St.": "Norfolk State",
    "San Diego St.": "San Diego State",
}


def fetch_bracket_json(year: int, cache_path: Path) -> dict:
    """Fetch from API or load from cache. Caches on first successful fetch."""
    if cache_path.exists():
        print(f"[cache] loading {cache_path.relative_to(PIPELINE_DIR)}")
        return json.loads(cache_path.read_text())
    url = f"{API_BASE}/brackets/basketball-men/d1/{year}"
    print(f"[api] GET {url}")
    r = requests.get(url, timeout=REQUEST_TIMEOUT)
    r.raise_for_status()
    data = r.json()
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(data, indent=2))
    print(f"[cache] wrote {cache_path.relative_to(PIPELINE_DIR)}")
    time.sleep(RATE_LIMIT_SLEEP)
    return data


def normalize_team_name(api_name: str) -> str:
    return NAME_NORMALIZE.get(api_name, api_name)


def derive_window_from_bracket(bracket_data: dict) -> str:
    """
    Derive the canonical 15-day hype window from a cached NCAA bracket
    response. Returns 'YYYY-MM-DD:YYYY-MM-DD' suitable for --window.

    Selection Sunday = the Sunday on or before the earliest game's startDate
    (which is a Tuesday for First Four years, or a Thursday for non-FF years).
    Window = (SS - SS_OFFSET_BEFORE days) to (SS + SS_OFFSET_AFTER days),
    inclusive — total span = WINDOW_DAYS.

    Imported by pull_trends.py and build_dataset.py via their resolve_window()
    helpers when --window is omitted on the CLI.
    """
    games = bracket_data["championships"][0]["games"]
    earliest = min(
        datetime.strptime(g["startDate"], "%m/%d/%Y").date()
        for g in games
    )
    # weekday(): Monday=0, ..., Sunday=6. Distance back to the most recent
    # Sunday (or 0 if `earliest` is already Sunday).
    days_back = (earliest.weekday() - 6) % 7
    ss = earliest - timedelta(days=days_back)
    start = ss - timedelta(days=SS_OFFSET_BEFORE)
    end = ss + timedelta(days=SS_OFFSET_AFTER)
    return f"{start.isoformat()}:{end.isoformat()}"


def derive_season_window_from_bracket(bracket_data: dict) -> str:
    """
    Derive the canonical season hype window from a cached NCAA bracket.
    Returns 'YYYY-MM-DD:YYYY-MM-DD' suitable for --window in --mode season.

    Window = (prior-year Nov 1) to (Selection Sunday + SS_OFFSET_AFTER days),
    inclusive. Tournament window is a strict subset of this range, which
    keeps the pre-tournament/tournament partition clean for the
    hype_acceleration math in build_dataset.py.
    """
    games = bracket_data["championships"][0]["games"]
    earliest = min(
        datetime.strptime(g["startDate"], "%m/%d/%Y").date()
        for g in games
    )
    days_back = (earliest.weekday() - 6) % 7
    ss = earliest - timedelta(days=days_back)
    start = date(ss.year - 1, 11, 1)
    end = ss + timedelta(days=SS_OFFSET_AFTER)
    return f"{start.isoformat()}:{end.isoformat()}"


def parse_bracket(data: dict) -> tuple[pd.DataFrame, dict[str, str]]:
    """
    Walk all games in championships[0] and produce:
      (1) a DataFrame with columns team, seed, region, wins
      (2) a {canonical_team_name: seoname} dict for downstream logo / asset
          lookups (consumed by fetch_logos.py and build_dataset.py)

    Region resolution:
      - sectionId 2-5: direct mapping (East/West/South/Midwest)
      - sectionId 1 (First Four): both teams inherit the WINNER's destination
        region (looked up via victorBracketPositionId)
      - sectionId 6 (Final Four / Championship): skip — Final Four teams already
        had their region set from their regional games

    Wins: count every game where isWinner == True, including First Four wins.
    """
    champ = data["championships"][0]
    games = champ["games"]

    # bracketPositionId → sectionId, for resolving First Four winner destinations
    bp_to_section = {g["bracketPositionId"]: g["sectionId"] for g in games}

    teams: dict[str, dict] = {}
    seonames: dict[str, str] = {}
    for g in games:
        sid = g["sectionId"]
        for t in g["teams"]:
            api_name = t["nameShort"]
            name = normalize_team_name(api_name)
            if name not in teams:
                teams[name] = {"seed": t["seed"], "region": None, "wins": 0}
            if t.get("seoname") and name not in seonames:
                seonames[name] = t["seoname"]
            if t.get("isWinner"):
                teams[name]["wins"] += 1
            if teams[name]["region"] is None:
                if sid in SECTION_TO_REGION:
                    teams[name]["region"] = SECTION_TO_REGION[sid]
                elif sid == 1:
                    victor_bp = g.get("victorBracketPositionId")
                    if victor_bp:
                        dest_sid = bp_to_section.get(victor_bp)
                        if dest_sid in SECTION_TO_REGION:
                            teams[name]["region"] = SECTION_TO_REGION[dest_sid]

    rows = [
        {"team": name, "seed": t["seed"], "region": t["region"], "wins": t["wins"]}
        for name, t in teams.items()
    ]
    df = pd.DataFrame(rows, columns=["team", "seed", "region", "wins"])
    # Stable, deterministic order: wins desc (champion first), then seed asc, then team alpha.
    df = df.sort_values(
        ["wins", "seed", "team"], ascending=[False, True, True]
    ).reset_index(drop=True)
    return df, seonames


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch a tournament bracket from the NCAA API and write it as a CSV."
    )
    parser.add_argument(
        "--year", type=int, required=True,
        help="Tournament year (e.g. 2026).",
    )
    parser.add_argument(
        "--output", type=Path, default=None,
        help="Output CSV path. Defaults to tournament_results_<year>.csv in the pipeline dir. "
             "Use --output /tmp/foo.csv to write to a temp path for diffing before committing.",
    )
    args = parser.parse_args()

    year = args.year
    cache_path = CACHE_DIR / f"ncaa_bracket_{year}.json"
    output_path = args.output if args.output is not None else PIPELINE_DIR / f"tournament_results_{year}.csv"

    data = fetch_bracket_json(year, cache_path)
    df, seonames = parse_bracket(data)
    df.to_csv(output_path, index=False)
    print(f"\nWrote {len(df)} teams to {output_path}")

    # Write seoname map (canonical team name → seoname slug) for downstream
    # consumers: fetch_logos.py uses it to fetch SVGs, build_dataset.py uses
    # it to set logo_path on each team in data.json.
    seonames_path = CACHE_DIR / f"seonames_{year}.json"
    seonames_path.parent.mkdir(parents=True, exist_ok=True)
    seonames_path.write_text(json.dumps(seonames, indent=2, sort_keys=True))
    print(f"Wrote {len(seonames)} seonames to {seonames_path.relative_to(PIPELINE_DIR)}")

    missing_region = df[df["region"].isna()]["team"].tolist()
    if missing_region:
        print(f"WARNING: {len(missing_region)} teams have no region (incomplete bracket?): {missing_region}")

    print()
    print("Region distribution:")
    print(df["region"].value_counts().to_string())

    print()
    print("Wins distribution (descending):")
    print(df["wins"].value_counts().sort_index(ascending=False).to_string())

    return 0


if __name__ == "__main__":
    sys.exit(main())
