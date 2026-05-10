"""
build_dataset.py

Combines tournament_results_<year>.csv + raw_hype_<year>.csv +
raw_hype_season_<year>.csv into data/<year>.json.

Computes (tournament window — cross-batch-normalized scale, byte-for-byte
preserved with prior versions of this script):
  hype_raw         = mean of normalized daily values (full precision input)
  hype_normalized  = scaled to 0-100 across all teams (100 = max)
  performance_rank = 'min' rank by wins (descending; champion = 1)
  hype_rank        = 'dense' rank by hype_raw (descending)
  gap              = hype_rank - performance_rank
                     (negative => overhyped, positive => underhyped)
  story_tag        = overhyped / underhyped / as_expected / noise

Computes (season window — standalone-pull scale, intra-team comparable only):
  season_hype_daily      = full standalone curve (~144 days)
  season_hype_raw        = mean of season_hype_daily values
  season_hype_normalized = scaled to 0-100 across teams (separate scale from hype_normalized)
  hype_acceleration      = (mean of season_hype_daily inside tournament window)
                          / max(mean of season_hype_daily before tournament window, ε=1.0)
                         Both numerator and denominator are on the same intra-team
                         standalone-pull scale — ratio is meaningful even though
                         absolute values aren't cross-team comparable.

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
SEASON_WINDOW_MIN_DAYS = 60   # match pull_trends.py
SEASON_WINDOW_MAX_DAYS = 270
ACCELERATION_EPSILON = 1.0  # denominator floor for hype_acceleration; prevents
                            # division blowups when pre-tournament hype is
                            # near-zero (mid-major Cinderellas in November).


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


def parse_season_window(s: str) -> str:
    """argparse type for --season-window. Allows 60-270 days inclusive."""
    m = _WINDOW_RE.match(s)
    if not m:
        raise argparse.ArgumentTypeError(
            f"--season-window must be 'YYYY-MM-DD:YYYY-MM-DD' (colon-separated). Got: {s!r}"
        )
    start_str, end_str = m.group(1), m.group(2)
    try:
        start = date.fromisoformat(start_str)
        end = date.fromisoformat(end_str)
    except ValueError as e:
        raise argparse.ArgumentTypeError(f"--season-window contains invalid date: {e}")
    if end <= start:
        raise argparse.ArgumentTypeError(
            f"--season-window end ({end}) must be after start ({start})"
        )
    days = (end - start).days + 1
    if days < SEASON_WINDOW_MIN_DAYS or days > SEASON_WINDOW_MAX_DAYS:
        raise argparse.ArgumentTypeError(
            f"--season-window must span between {SEASON_WINDOW_MIN_DAYS} and "
            f"{SEASON_WINDOW_MAX_DAYS} days inclusive. Got {days} days."
        )
    return s


def resolve_window(year: int, explicit: str | None) -> str:
    """
    Pick the effective hype window: explicit --window if provided, otherwise
    derive from the cached NCAA bracket via fetch_bracket.derive_window_from_bracket.

    Hard-fails with a clear next-step message if the user didn't provide
    --window AND fetch_bracket.py hasn't been run yet for this year.
    """
    if explicit is not None:
        return explicit
    cache_path = CACHE_DIR / f"ncaa_bracket_{year}.json"
    if not cache_path.exists():
        raise SystemExit(
            f"ERROR: --window not provided AND {cache_path.relative_to(PIPELINE_DIR)} "
            f"does not exist. Either pass --window YYYY-MM-DD:YYYY-MM-DD explicitly, "
            f"or run `python fetch_bracket.py --year {year}` first."
        )
    from fetch_bracket import derive_window_from_bracket
    bracket = json.loads(cache_path.read_text())
    derived = derive_window_from_bracket(bracket)
    return parse_window(derived)


def resolve_season_window(year: int, explicit: str | None) -> str:
    """Mirror of resolve_window for --season-window."""
    if explicit is not None:
        return explicit
    cache_path = CACHE_DIR / f"ncaa_bracket_{year}.json"
    if not cache_path.exists():
        raise SystemExit(
            f"ERROR: --season-window not provided AND {cache_path.relative_to(PIPELINE_DIR)} "
            f"does not exist. Either pass --season-window YYYY-MM-DD:YYYY-MM-DD explicitly, "
            f"or run `python fetch_bracket.py --year {year}` first."
        )
    from fetch_bracket import derive_season_window_from_bracket
    bracket = json.loads(cache_path.read_text())
    derived = derive_season_window_from_bracket(bracket)
    return parse_season_window(derived)


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
        "--window", type=parse_window, default=None,
        help=(
            "Hype window: YYYY-MM-DD:YYYY-MM-DD. Optional — if omitted, "
            "auto-derived from cache/ncaa_bracket_<year>.json (must match the "
            "window used for pull_trends.py — both sides of the pipeline read "
            "the same source of truth)."
        ),
    )
    parser.add_argument(
        "--season-window", dest="season_window", type=parse_season_window, default=None,
        help=(
            "Season hype window: YYYY-MM-DD:YYYY-MM-DD, 60-270 days inclusive. "
            "Optional — if omitted, auto-derived via "
            "fetch_bracket.derive_season_window_from_bracket. Must match the "
            "window used for `pull_trends.py --mode season`."
        ),
    )
    args = parser.parse_args()

    year = args.year
    tournament_csv = PIPELINE_DIR / f"tournament_results_{year}.csv"
    raw_hype_csv = PIPELINE_DIR / f"raw_hype_{year}.csv"
    raw_hype_season_csv = PIPELINE_DIR / f"raw_hype_season_{year}.csv"
    output_json = REPO_ROOT / "data" / f"{year}.json"
    window = resolve_window(year, args.window)
    season_window = resolve_season_window(year, args.season_window)
    if args.window is None:
        print(f"[window] auto-derived from bracket cache: {window}")
    if args.season_window is None:
        print(f"[season-window] auto-derived from bracket cache: {season_window}")
    window_start, window_end = window.split(":")
    season_window_start, season_window_end = season_window.split(":")

    if not raw_hype_season_csv.exists():
        raise SystemExit(
            f"ERROR: {raw_hype_season_csv.relative_to(PIPELINE_DIR)} does not exist. "
            f"Run `python pull_trends.py --year {year} --mode season` first."
        )

    print("[byte-compat] preserving existing tournament-mode fields; appending season + acceleration")

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
    raw_hype_season = pd.read_csv(raw_hype_season_csv)

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

    raw_hype_season["season_hype_daily_parsed"] = raw_hype_season["hype_daily"].apply(json.loads)
    raw_hype_season["season_hype_raw"] = raw_hype_season["season_hype_daily_parsed"].apply(
        lambda d: sum(x["value"] for x in d) / len(d) if d else 0.0
    )
    # Acceleration: split season_hype_daily at the tournament window boundary.
    # Pre-tournament = entries with date < window_start. Numerator is the
    # tournament-window slice of the SAME season_hype_daily series (not the
    # cross-batch normalized hype_raw — different scale).
    def _split_means(daily: list[dict]) -> tuple[float, float]:
        pre_vals = [x["value"] for x in daily if x["date"] < window_start]
        in_vals = [x["value"] for x in daily if window_start <= x["date"] <= window_end]
        pre_mean = sum(pre_vals) / len(pre_vals) if pre_vals else 0.0
        in_mean = sum(in_vals) / len(in_vals) if in_vals else 0.0
        return pre_mean, in_mean

    pre_in_means = raw_hype_season["season_hype_daily_parsed"].apply(_split_means)
    raw_hype_season["pre_tournament_mean"] = [m[0] for m in pre_in_means]
    raw_hype_season["in_tournament_mean"] = [m[1] for m in pre_in_means]
    raw_hype_season["hype_acceleration"] = (
        raw_hype_season["in_tournament_mean"]
        / raw_hype_season["pre_tournament_mean"].clip(lower=ACCELERATION_EPSILON)
    )

    df = tournament.merge(
        raw_hype[["team", "hype_raw", "hype_daily_parsed"]],
        on="team",
        how="left",
    )
    df = df.merge(
        raw_hype_season[["team", "season_hype_raw", "season_hype_daily_parsed", "hype_acceleration"]],
        on="team",
        how="left",
    )

    missing = df[df["hype_raw"].isna()]["team"].tolist()
    if missing:
        print(f"WARNING: {len(missing)} teams have no tournament hype data: {missing}")
        df = df.dropna(subset=["hype_raw"]).copy()

    missing_season = df[df["season_hype_raw"].isna()]["team"].tolist()
    if missing_season:
        print(f"WARNING: {len(missing_season)} teams have no season hype data: {missing_season}")

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

    max_season_hype = df["season_hype_raw"].max()
    df["season_hype_normalized"] = (df["season_hype_raw"] / max_season_hype * 100).round(2)
    df["season_hype_raw"] = df["season_hype_raw"].round(2)
    df["hype_acceleration"] = df["hype_acceleration"].round(2)

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
        season_daily_rounded = [
            {"date": d["date"], "value": round(d["value"], 2)}
            for d in (r["season_hype_daily_parsed"] or [])
        ] if isinstance(r["season_hype_daily_parsed"], list) else []
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
            "season_hype_raw": float(r["season_hype_raw"]) if pd.notna(r["season_hype_raw"]) else 0.0,
            "season_hype_normalized": float(r["season_hype_normalized"]) if pd.notna(r["season_hype_normalized"]) else 0.0,
            "season_hype_daily": season_daily_rounded,
            "hype_acceleration": float(r["hype_acceleration"]) if pd.notna(r["hype_acceleration"]) else 0.0,
        })

    output = {
        "metadata": {
            "tournament_year": year,
            "hype_window_start": window_start,
            "hype_window_end": window_end,
            "season_window_start": season_window_start,
            "season_window_end": season_window_end,
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
