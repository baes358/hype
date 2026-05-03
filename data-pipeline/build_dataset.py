"""
build_dataset.py

Combines tournament_results_<year>.csv + raw_hype_<year>.csv into data/<year>.json.

Computes:
  hype_raw         = mean of normalized daily values (full precision input)
  hype_normalized  = scaled to 0-100 across all teams (100 = max)
  performance_rank = 'min' rank by wins (descending; champion = 1)
  hype_rank        = 'dense' rank by hype_raw (descending)
  gap              = hype_rank - performance_rank
                     (negative => overhyped, positive => underhyped)
  story_tag        = overhyped / underhyped / as_expected / noise

Run:
  python build_dataset.py --year 2026 --window 2026-03-03:2026-03-17
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import date, datetime, timezone
from pathlib import Path

import pandas as pd

from findings import get_finding

PIPELINE_DIR = Path(__file__).resolve().parent
REPO_ROOT = PIPELINE_DIR.parent
CACHE_DIR = PIPELINE_DIR / "cache"
LOGOS_DIR = REPO_ROOT / "web" / "public" / "logos"

WINDOW_DAYS_INCLUSIVE = 15  # safety net — must match pull_trends.py


# ---------------------------------------------------------------------------
# CLI arg validation (intentionally duplicated from pull_trends.py — two
# scripts is not enough duplication to justify a shared module)
# ---------------------------------------------------------------------------

_WINDOW_RE = re.compile(r"^(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$")


def parse_window(s: str) -> str:
    """Strict argparse type for --window. Returns canonical 'YYYY-MM-DD:YYYY-MM-DD'."""
    m = _WINDOW_RE.match(s)
    if not m:
        raise argparse.ArgumentTypeError(
            f"--window must be 'YYYY-MM-DD:YYYY-MM-DD' (colon-separated). Got: {s!r}"
        )
    start_str, end_str = m.group(1), m.group(2)
    try:
        start = date.fromisoformat(start_str)
        end = date.fromisoformat(end_str)
    except ValueError as e:
        raise argparse.ArgumentTypeError(f"--window contains invalid date: {e}")
    if end <= start:
        raise argparse.ArgumentTypeError(
            f"--window end ({end}) must be after start ({start})"
        )
    days = (end - start).days + 1
    if days != WINDOW_DAYS_INCLUSIVE:
        raise argparse.ArgumentTypeError(
            f"--window must span exactly {WINDOW_DAYS_INCLUSIVE} days inclusive. "
            f"Got {days} days."
        )
    return s


def story_tag(gap: int) -> str:
    if gap <= -15:
        return "overhyped"
    if gap > 25:
        return "underhyped"
    if abs(gap) <= 10:
        return "as_expected"
    return "noise"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build canonical data/<year>.json from CSV + raw hype.",
    )
    parser.add_argument(
        "--year", type=int, required=True,
        help="Tournament year (e.g. 2026). Drives input/output paths and metadata.",
    )
    parser.add_argument(
        "--window", type=parse_window, required=True,
        help="Hype window: YYYY-MM-DD:YYYY-MM-DD (must match the --window used for pull_trends.py).",
    )
    args = parser.parse_args()

    year = args.year
    tournament_csv = PIPELINE_DIR / f"tournament_results_{year}.csv"
    raw_hype_csv = PIPELINE_DIR / f"raw_hype_{year}.csv"
    output_json = REPO_ROOT / "data" / f"{year}.json"
    window_start, window_end = args.window.split(":")

    # Load seoname map if present (produced by fetch_bracket.py). logo_path is
    # set on each team only when (a) we have a seoname AND (b) the SVG file
    # exists on disk. If the seoname map is missing entirely, all logo_paths
    # are null — the web app should treat null as "no logo, render fallback".
    seonames_path = CACHE_DIR / f"seonames_{year}.json"
    seonames: dict[str, str] = (
        json.loads(seonames_path.read_text()) if seonames_path.exists() else {}
    )

    tournament = pd.read_csv(tournament_csv)
    raw_hype = pd.read_csv(raw_hype_csv)

    placeholder_mask = tournament["team"].str.startswith("First Four Loser")
    skipped = tournament[placeholder_mask]["team"].tolist()
    if skipped:
        print(f"Skipping {len(skipped)} placeholder rows: {skipped}")
    tournament = tournament[~placeholder_mask].copy()

    raw_hype["hype_daily_parsed"] = raw_hype["hype_daily"].apply(json.loads)
    # Mean computed on full-precision unrounded daily values.
    raw_hype["hype_raw"] = raw_hype["hype_daily_parsed"].apply(
        lambda d: sum(x["value"] for x in d) / len(d) if d else 0.0
    )

    df = tournament.merge(
        raw_hype[["team", "hype_raw", "hype_daily_parsed"]],
        on="team",
        how="left",
    )

    missing = df[df["hype_raw"].isna()]["team"].tolist()
    if missing:
        print(f"WARNING: {len(missing)} teams have no hype data: {missing}")
        df = df.dropna(subset=["hype_raw"]).copy()

    zero_hype = df[df["hype_raw"] == 0]["team"].tolist()
    if zero_hype:
        print(f"WARNING: {len(zero_hype)} teams have hype_raw == 0: {zero_hype}")

    max_hype = df["hype_raw"].max()
    df["hype_normalized"] = (df["hype_raw"] / max_hype * 100).round(2)
    df["hype_rank"] = df["hype_raw"].rank(method="dense", ascending=False).astype(int)
    # 'min' rank (not 'dense'): tied teams share a rank that reflects their
    # position in the full 1-N ordering. Dense rank crushes performance_rank
    # to 1-7 (only 7 distinct win counts) and breaks the gap arithmetic — see
    # the analysis from 2026-05-02 in the project README/commit history.
    df["performance_rank"] = df["wins"].rank(method="min", ascending=False).astype(int)
    df["gap"] = (df["hype_rank"] - df["performance_rank"]).astype(int)
    df["story_tag"] = df["gap"].apply(story_tag)
    df["hype_raw"] = df["hype_raw"].round(2)

    # Flag First Four losers via duplicate (region, seed) detection. The NCAA
    # bracket only ever has duplicates for First Four matchups: both teams in a
    # play-in inherit the winner's destination region+seed. The lower-wins team
    # in each pair is the loser; everyone else made the main 64-team bracket.
    df["made_main_bracket"] = True
    duplicated = df.duplicated(subset=["region", "seed"], keep=False)
    if duplicated.any():
        ff_losers = df[duplicated].loc[
            df[duplicated].groupby(["region", "seed"])["wins"].idxmin()
        ].index
        df.loc[ff_losers, "made_main_bracket"] = False

    teams = []
    for _, r in df.iterrows():
        daily_rounded = [
            {"date": d["date"], "value": round(d["value"], 2)}
            for d in r["hype_daily_parsed"]
        ]
        slug = seonames.get(r["team"])
        # Only set logo_path if the SVG was actually fetched. Avoids data.json
        # pointing at 404s when fetch_logos.py hasn't been run or when a team's
        # logo missed on the NCAA CDN.
        logo_path = (
            f"/logos/{slug}.svg"
            if slug and (LOGOS_DIR / f"{slug}.svg").exists()
            else None
        )
        teams.append({
            "team": r["team"],
            "seed": int(r["seed"]),
            "region": r["region"],
            "wins": int(r["wins"]),
            "hype_raw": float(r["hype_raw"]),
            "hype_normalized": float(r["hype_normalized"]),
            "hype_daily": daily_rounded,
            "hype_rank": int(r["hype_rank"]),
            "performance_rank": int(r["performance_rank"]),
            "gap": int(r["gap"]),
            "story_tag": r["story_tag"],
            "made_main_bracket": bool(r["made_main_bracket"]),
            "logo_path": logo_path,
        })

    output = {
        "metadata": {
            "tournament_year": year,
            "hype_window_start": window_start,
            "hype_window_end": window_end,
            "total_teams": len(teams),
            "data_pulled_at": datetime.now(timezone.utc).isoformat(),
        },
        "finding": get_finding(year),
        "teams": teams,
    }

    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_json.write_text(json.dumps(output, indent=2))
    print(f"\nWrote {output_json.relative_to(REPO_ROOT)} with {len(teams)} teams.")

    print()
    print(f"=== {year} TOP 10 MOST OVERHYPED (negative gap) ===")
    over = df.sort_values("gap").head(10)
    print(over[["team", "seed", "wins", "hype_rank", "performance_rank", "gap", "story_tag"]].to_string(index=False))

    print()
    print(f"=== {year} TOP 10 MOST UNDERHYPED (positive gap) ===")
    under = df.sort_values("gap", ascending=False).head(10)
    print(under[["team", "seed", "wins", "hype_rank", "performance_rank", "gap", "story_tag"]].to_string(index=False))

    print()
    print(f"=== {year} ALL {len(df)} TEAMS BY HYPE_RAW (Task 5 sanity table) ===")
    full = df.sort_values("hype_raw", ascending=False)[["team", "seed", "hype_raw", "wins"]].copy()
    full.insert(0, "rank", range(1, len(full) + 1))
    print(full.to_string(index=False))

    print()
    print(f"=== {year} story_tag distribution ===")
    print(df["story_tag"].value_counts().to_string())

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
