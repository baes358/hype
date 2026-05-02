"""
build_dataset.py

Combines tournament_results.csv + raw_hype.csv into data/data.json.

Computes:
  hype_raw         = mean of normalized daily values (full precision input)
  hype_normalized  = scaled to 0-100 across all teams (100 = max)
  performance_rank = dense rank by wins (descending; champion = 1)
  hype_rank        = dense rank by hype_raw (descending)
  gap              = hype_rank - performance_rank
                     (negative => overhyped, positive => underhyped)
  story_tag        = overhyped / underhyped / as_expected / noise
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

PIPELINE_DIR = Path(__file__).resolve().parent
REPO_ROOT = PIPELINE_DIR.parent
TOURNAMENT_CSV = PIPELINE_DIR / "tournament_results.csv"
RAW_HYPE_CSV = PIPELINE_DIR / "raw_hype.csv"
OUTPUT_JSON = REPO_ROOT / "data" / "data.json"

TOURNAMENT_YEAR = 2026
HYPE_WINDOW_START = "2026-03-03"
HYPE_WINDOW_END = "2026-03-17"


def story_tag(gap: int) -> str:
    if gap < -20:
        return "overhyped"
    if gap > 20:
        return "underhyped"
    if abs(gap) <= 10:
        return "as_expected"
    return "noise"


def main() -> int:
    tournament = pd.read_csv(TOURNAMENT_CSV)
    raw_hype = pd.read_csv(RAW_HYPE_CSV)

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

    teams = []
    for _, r in df.iterrows():
        daily_rounded = [
            {"date": d["date"], "value": round(d["value"], 2)}
            for d in r["hype_daily_parsed"]
        ]
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
        })

    output = {
        "metadata": {
            "tournament_year": TOURNAMENT_YEAR,
            "hype_window_start": HYPE_WINDOW_START,
            "hype_window_end": HYPE_WINDOW_END,
            "total_teams": len(teams),
            "data_pulled_at": datetime.now(timezone.utc).isoformat(),
        },
        "finding": "[finding TBD]",
        "teams": teams,
    }

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(output, indent=2))
    print(f"\nWrote {OUTPUT_JSON.relative_to(REPO_ROOT)} with {len(teams)} teams.")

    print()
    print("=== TOP 10 MOST OVERHYPED (negative gap) ===")
    over = df.sort_values("gap").head(10)
    print(over[["team", "seed", "wins", "hype_rank", "performance_rank", "gap", "story_tag"]].to_string(index=False))

    print()
    print("=== TOP 10 MOST UNDERHYPED (positive gap) ===")
    under = df.sort_values("gap", ascending=False).head(10)
    print(under[["team", "seed", "wins", "hype_rank", "performance_rank", "gap", "story_tag"]].to_string(index=False))

    print()
    print(f"=== ALL {len(df)} TEAMS BY HYPE_RAW (Task 5 sanity table) ===")
    full = df.sort_values("hype_raw", ascending=False)[["team", "seed", "hype_raw", "wins"]].copy()
    full.insert(0, "rank", range(1, len(full) + 1))
    print(full.to_string(index=False))

    print()
    print("=== story_tag distribution ===")
    print(df["story_tag"].value_counts().to_string())

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
