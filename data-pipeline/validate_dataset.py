"""
validate_dataset.py

Lightweight schema + range + byte-compat validator for data/<year>.json.

Project has a no-formal-tests policy, but a single fast validator that
runs in well under a second is squarely on the right side of that line —
it catches schema regressions, byte-compat regressions, and obviously
broken acceleration values in one pass.

Run:
  python validate_dataset.py --year 2026
  python validate_dataset.py --year 2026 --write-snapshot /tmp/2026-pre.json
  python validate_dataset.py --year 2026 --snapshot /tmp/2026-pre.json

Exit codes:
  0  pass
  1  hard failure (schema, byte-compat, or impossible value)
  2  soft warning (distribution looks off; output is still usable)
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
from datetime import date
from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parent
REPO_ROOT = PIPELINE_DIR.parent

EXISTING_FIELDS = [
    "team", "seed", "region", "wins",
    "hype_raw", "hype_normalized", "hype_daily",
    "hype_rank", "performance_rank", "gap", "story_tag",
    "made_main_bracket", "logo_path",
]
NEW_FIELDS = [
    "season_hype_raw", "season_hype_normalized",
    "season_hype_daily", "hype_acceleration",
]
ALL_FIELDS = EXISTING_FIELDS + NEW_FIELDS

EXISTING_METADATA = ["tournament_year", "hype_window_start", "hype_window_end", "total_teams", "data_pulled_at"]
NEW_METADATA = ["season_window_start", "season_window_end"]

VALID_STORY_TAGS = {"overhyped", "underhyped", "as_expected", "noise"}


def project_existing(team: dict) -> dict:
    """Subset of fields that must stay byte-for-byte stable across this PR."""
    return {k: team[k] for k in EXISTING_FIELDS if k in team}


def fail(msg: str) -> None:
    print(f"FAIL: {msg}", file=sys.stderr)


def warn(msg: str) -> None:
    print(f"WARN: {msg}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate data/<year>.json schema and ranges.")
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument("--snapshot", type=Path, default=None,
                        help="Path to pre-change snapshot JSON for byte-compat diff (existing fields only).")
    parser.add_argument("--write-snapshot", dest="write_snapshot", type=Path, default=None,
                        help="Capture the existing-fields projection to this path and exit. "
                             "Run on `main` BEFORE any edits, then `--snapshot` after.")
    args = parser.parse_args()

    data_path = REPO_ROOT / "data" / f"{args.year}.json"
    if not data_path.exists():
        fail(f"{data_path} does not exist.")
        return 1
    data = json.loads(data_path.read_text())

    if args.write_snapshot:
        projection = [project_existing(t) for t in data["teams"]]
        args.write_snapshot.write_text(json.dumps(projection, indent=2))
        print(f"Wrote {len(projection)}-team snapshot to {args.write_snapshot}")
        return 0

    hard_failures = 0
    soft_warnings = 0

    # 1. Metadata completeness
    meta = data.get("metadata", {})
    for k in EXISTING_METADATA + NEW_METADATA:
        if k not in meta:
            fail(f"metadata missing key: {k}")
            hard_failures += 1

    if hard_failures == 0:
        try:
            hws = date.fromisoformat(meta["hype_window_start"])
            hwe = date.fromisoformat(meta["hype_window_end"])
            sws = date.fromisoformat(meta["season_window_start"])
            swe = date.fromisoformat(meta["season_window_end"])
        except ValueError as e:
            fail(f"window date parse failure: {e}")
            return 1
        if not (sws <= hws and hwe <= swe):
            fail(f"tournament window [{hws}..{hwe}] is not a subset of season window [{sws}..{swe}]")
            hard_failures += 1

    # 2. Schema completeness per team
    teams = data.get("teams", [])
    for t in teams:
        for k in ALL_FIELDS:
            if k not in t:
                fail(f"team {t.get('team', '?')!r} missing field: {k}")
                hard_failures += 1
        if t.get("story_tag") not in VALID_STORY_TAGS:
            fail(f"team {t['team']!r} has invalid story_tag: {t.get('story_tag')!r}")
            hard_failures += 1

    if hard_failures:
        print(f"\nValidation FAILED with {hard_failures} hard failures.", file=sys.stderr)
        return 1

    # 3. Range checks on new fields
    expected_season_days = (date.fromisoformat(meta["season_window_end"]) - date.fromisoformat(meta["season_window_start"])).days + 1
    accels = []
    for t in teams:
        if t["season_hype_raw"] < 0:
            fail(f"{t['team']!r}: season_hype_raw < 0")
            hard_failures += 1
        if not (0 <= t["season_hype_normalized"] <= 100):
            fail(f"{t['team']!r}: season_hype_normalized out of [0, 100]: {t['season_hype_normalized']}")
            hard_failures += 1
        if t["hype_acceleration"] <= 0:
            fail(f"{t['team']!r}: hype_acceleration <= 0 (impossible with epsilon floor): {t['hype_acceleration']}")
            hard_failures += 1
        accels.append(t["hype_acceleration"])
        if abs(len(t["season_hype_daily"]) - expected_season_days) > 1:
            warn(f"{t['team']!r}: season_hype_daily has {len(t['season_hype_daily'])} entries, expected ~{expected_season_days}")
            soft_warnings += 1

    # season_hype_normalized: exactly one team should be at 100
    max_norm_teams = [t["team"] for t in teams if t["season_hype_normalized"] == 100.0]
    if len(max_norm_teams) != 1:
        warn(f"expected exactly one team with season_hype_normalized == 100, got {len(max_norm_teams)}: {max_norm_teams}")
        soft_warnings += 1

    # 4. Distribution sanity for hype_acceleration
    accels_sorted = sorted(accels)
    p5 = statistics.quantiles(accels_sorted, n=20)[0]
    p25 = statistics.quantiles(accels_sorted, n=4)[0]
    p50 = statistics.median(accels_sorted)
    p75 = statistics.quantiles(accels_sorted, n=4)[2]
    p95 = statistics.quantiles(accels_sorted, n=20)[18]
    print(f"hype_acceleration percentiles: p5={p5:.2f}  p25={p25:.2f}  p50={p50:.2f}  p75={p75:.2f}  p95={p95:.2f}")
    if p50 > 50:
        warn(f"median acceleration > 50 ({p50:.2f}) — formula may be mis-scaled")
        soft_warnings += 1
    if p95 > 200:
        warn(f"95th percentile acceleration > 200 ({p95:.2f}) — epsilon floor may be too low")
        soft_warnings += 1

    # 5. Byte-compat diff vs snapshot
    if args.snapshot:
        snap = json.loads(args.snapshot.read_text())
        if len(snap) != len(teams):
            fail(f"snapshot has {len(snap)} teams; current has {len(teams)}")
            hard_failures += 1
        else:
            snap_by_team = {t["team"]: t for t in snap}
            for t in teams:
                snap_t = snap_by_team.get(t["team"])
                if snap_t is None:
                    fail(f"{t['team']!r}: missing from snapshot")
                    hard_failures += 1
                    continue
                projected = project_existing(t)
                if projected != snap_t:
                    fail(f"{t['team']!r}: existing fields drifted from snapshot")
                    for k in EXISTING_FIELDS:
                        if k in snap_t and projected.get(k) != snap_t[k]:
                            fail(f"  field={k!r}: snapshot={snap_t[k]!r}  current={projected.get(k)!r}")
                    hard_failures += 1

    if hard_failures:
        print(f"\nValidation FAILED with {hard_failures} hard failures.", file=sys.stderr)
        return 1
    if soft_warnings:
        print(f"\nValidation passed with {soft_warnings} soft warnings.")
        return 2
    print("\nValidation PASSED.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
