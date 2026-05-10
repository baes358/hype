"""
probe_reference.py

Quick standalone probe for a candidate reference team in a given mode.
Pulls ONE pytrends call (no batching, no normalization) and reports
whether the team's daily baseline survives the window — specifically
that min > 0 every day, since the cross-batch normalization in
pull_trends.py divides by the in-batch reference value per day.

Run BEFORE kicking off a real pull, especially in --mode season where
the 4.5-month window makes zero days much more likely than in the
15-day tournament window.

Run:
  python probe_reference.py --year 2026 --team "Duke"            # season mode default
  python probe_reference.py --year 2026 --team "Florida" --mode tournament
  python probe_reference.py --year 2026 --team "Duke" --window 2025-11-01:2026-03-24

Exit codes:
  0  pass: min > 0 AND fewer than 5 days at value < 5
  1  hard fail: min == 0 (cannot anchor)
  2  soft warn: min > 0 but ≥5 sub-5 days (denominator-fragile)
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd
from pytrends.request import TrendReq

from pull_trends import (
    GEO,
    TEAM_QUERY_MAP,
    parse_season_window,
    parse_window,
    resolve_season_window,
    resolve_window,
)

PIPELINE_DIR = Path(__file__).resolve().parent

SUGGESTIONS = ["Duke", "Kentucky", "North Carolina", "Kansas"]
SUB_5_HARD_THRESHOLD = 5  # ≥ this many sub-5 days => soft-warn exit 2


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Probe a candidate reference team for cross-batch normalization viability."
    )
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument("--team", required=True, help="Candidate reference team (must exist in tournament_results_<year>.csv)")
    parser.add_argument("--mode", choices=["tournament", "season"], default="season")
    parser.add_argument("--window", type=str, default=None,
                        help="Optional override; auto-derived from bracket cache if omitted.")
    args = parser.parse_args()

    csv_path = PIPELINE_DIR / f"tournament_results_{args.year}.csv"
    if not csv_path.exists():
        print(f"ERROR: {csv_path.relative_to(PIPELINE_DIR)} does not exist.", file=sys.stderr)
        return 1
    teams_in_csv = set(pd.read_csv(csv_path)["team"].tolist())
    if args.team not in teams_in_csv:
        print(f"ERROR: --team={args.team!r} not in {csv_path.name}.", file=sys.stderr)
        return 1
    if args.team not in TEAM_QUERY_MAP:
        print(f"ERROR: --team={args.team!r} has no entry in TEAM_QUERY_MAP.", file=sys.stderr)
        return 1

    if args.mode == "tournament":
        explicit = parse_window(args.window) if args.window else None
        window = resolve_window(args.year, explicit)
    else:
        explicit = parse_season_window(args.window) if args.window else None
        window = resolve_season_window(args.year, explicit)
    timeframe = window.replace(":", " ")
    query = TEAM_QUERY_MAP[args.team]

    print(f"[probe] team={args.team!r} mode={args.mode} window={window} query={query!r}")
    pytrends = TrendReq(hl="en-US", tz=360)
    pytrends.build_payload([query], cat=0, timeframe=timeframe, geo=GEO)
    df = pytrends.interest_over_time().drop(columns=["isPartial"], errors="ignore")
    if df.empty or query not in df.columns:
        print("FAIL: pytrends returned empty series. Try a different query string or window.")
        return 1

    series = df[query]
    series_min = int(series.min())
    series_max = int(series.max())
    series_mean = float(series.mean())
    zero_days = series[series == 0]
    sub_5_days = series[series < 5]

    print(f"  min={series_min}  max={series_max}  mean={series_mean:.2f}  days={len(series)}")
    print(f"  zero-days={len(zero_days)}  sub-5-days={len(sub_5_days)}")

    if series_min == 0:
        print("\nFAIL (exit 1): min == 0 — this team cannot anchor cross-batch normalization.")
        worst = zero_days.head(3)
        if len(worst):
            print("  worst zero days:")
            for idx, val in worst.items():
                print(f"    {idx.strftime('%Y-%m-%d')}: {int(val)}")
        print("  Try one of the year-round national programs: " + ", ".join(SUGGESTIONS))
        return 1

    if len(sub_5_days) >= SUB_5_HARD_THRESHOLD:
        print(
            f"\nWARN (exit 2): min > 0 but {len(sub_5_days)} days at value < 5. "
            f"Denominator-fragile; expect noisy normalized values."
        )
        print("  Suggested alternates: " + ", ".join(SUGGESTIONS))
        return 2

    print("\nPASS (exit 0): viable reference team for this window.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
