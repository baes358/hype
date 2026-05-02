"""
pull_trends.py

Pull Google Trends "hype" curves for every team in tournament_results.csv.

Cross-batch normalization (REQUIRED — see Flag 1 in project spec):
  Trends scores are normalized within a single query, so scores from
  different 5-team batches are not directly comparable. We anchor every
  batch with a reference team (Michigan), pull a dedicated baseline
  curve for that team alone, then rescale every other team's series
  against Michigan's in-batch curve and the baseline:

      normalized[d] = (team_in_batch[d] / ref_in_batch[d]) * ref_baseline[d]

Run:
  python pull_trends.py            # full 64-team pull
  python pull_trends.py --dry-run  # 3 teams only (smoke test)
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from pytrends.request import TrendReq

try:
    from pytrends.exceptions import TooManyRequestsError
except ImportError:
    TooManyRequestsError = Exception  # type: ignore[misc, assignment]


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

PIPELINE_DIR = Path(__file__).resolve().parent
CSV_PATH = PIPELINE_DIR / "tournament_results.csv"
CACHE_DIR = PIPELINE_DIR / "cache"
CACHE_FILE = CACHE_DIR / "raw_trends.json"
OUTPUT_CSV = PIPELINE_DIR / "raw_hype.csv"

REFERENCE_TEAM = "Michigan"  # must match a row in tournament_results.csv
TIMEFRAME = "2026-03-03 2026-03-17"  # 15 days inclusive
GEO = "US"
BATCH_SIZE = 5  # Trends max kw_list size — REFERENCE + 4 others
SLEEP_BETWEEN_BATCHES = 2
RATE_LIMIT_BACKOFF = 60
MAX_RETRIES = 1
ZERO_REF_DAY_WARN_THRESHOLD = 3  # > N zero-ref days in window => loud flag


# Mascot-disambiguated query strings (Flag 2). Keys MUST match CSV `team`.
# Common-word names (Texas, Houston, Florida, Kansas, etc.) all carry the
# mascot to filter out football, pro, and city noise.
TEAM_QUERY_MAP: dict[str, str] = {
    # 1-seeds
    "Michigan": "Michigan Wolverines basketball",
    "Arizona": "Arizona Wildcats basketball",
    "Duke": "Duke Blue Devils basketball",
    "Florida": "Florida Gators basketball",
    # 2-seeds
    "UConn": "UConn Huskies basketball",
    "Purdue": "Purdue Boilermakers basketball",
    "Houston": "Houston Cougars basketball",
    "Iowa State": "Iowa State Cyclones basketball",
    # 3-seeds
    "Illinois": "Illinois Fighting Illini basketball",
    "Michigan State": "Michigan State Spartans basketball",
    "Gonzaga": "Gonzaga Bulldogs basketball",
    "Virginia": "Virginia Cavaliers basketball",
    # 4-seeds
    "Nebraska": "Nebraska Cornhuskers basketball",
    "Arkansas": "Arkansas Razorbacks basketball",
    "Alabama": "Alabama Crimson Tide basketball",
    "Kansas": "Kansas Jayhawks basketball",
    # 5-seeds
    "St. John's": "St Johns basketball",
    "Vanderbilt": "Vanderbilt Commodores basketball",
    "Texas Tech": "Texas Tech Red Raiders basketball",
    "Wisconsin": "Wisconsin Badgers basketball",
    # 6-seeds
    "Tennessee": "Tennessee Volunteers basketball",
    "Louisville": "Louisville Cardinals basketball",
    "North Carolina": "North Carolina Tar Heels basketball",
    "BYU": "BYU Cougars basketball",
    # 7-seeds
    "UCLA": "UCLA Bruins basketball",
    "Miami (FL)": "Miami Hurricanes basketball",
    "St. Mary's": "Saint Marys basketball",
    "Kentucky": "Kentucky Wildcats basketball",
    # 8-seeds
    "Ohio State": "Ohio State Buckeyes basketball",
    "Clemson": "Clemson Tigers basketball",
    "Villanova": "Villanova Wildcats basketball",
    "Georgia": "Georgia Bulldogs basketball",
    # 9-seeds
    "Iowa": "Iowa Hawkeyes basketball",
    "TCU": "TCU Horned Frogs basketball",
    "Utah State": "Utah State Aggies basketball",
    "Saint Louis": "Saint Louis Billikens basketball",
    # 10-seeds
    "Texas A&M": "Texas A&M Aggies basketball",
    "UCF": "UCF Knights basketball",
    "Missouri": "Missouri Tigers basketball",
    "Santa Clara": "Santa Clara Broncos basketball",
    # 11-seeds
    "Texas": "Texas Longhorns basketball",
    "VCU": "VCU Rams basketball",
    "South Florida": "South Florida Bulls basketball",
    "Miami (OH)": "Miami RedHawks basketball",
    # 12-seeds
    "High Point": "High Point basketball",
    "Northern Iowa": "Northern Iowa basketball",
    "McNeese State": "McNeese basketball",
    "Akron": "Akron Zips basketball",
    # 13-seeds
    "Cal Baptist": "Cal Baptist basketball",
    "Troy": "Troy Trojans basketball",
    "Hawaii": "Hawaii Rainbow Warriors",
    "Hofstra": "Hofstra University basketball",
    # 14-seeds
    "North Dakota State": "North Dakota State basketball",
    "Penn": "Penn Quakers basketball",
    "Kennesaw State": "Kennesaw State basketball",
    "Wright State": "Wright State basketball",
    # 15-seeds
    "Furman": "Furman basketball",
    "Idaho": "Idaho Vandals basketball",
    "Queens": "Queens Royals basketball",
    "Tennessee State": "Tennessee State basketball",
    # 16-seeds (excluding First Four placeholders)
    "Siena": "Siena College basketball",
    "Prairie View A&M": "Prairie View basketball",
    "Long Island": "LIU basketball",
    "Howard": "Howard Bison basketball",

    # First Four losers (added 2026-05-03)
    "UMBC": "UMBC basketball",
    "Lehigh": "Lehigh basketball",
    "NC State": "NC State basketball",
    "SMU": "SMU basketball",
}


# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------

def load_cache() -> dict:
    if CACHE_FILE.exists():
        with CACHE_FILE.open() as f:
            return json.load(f)
    return {"baseline": None, "teams": {}}


def save_cache(cache: dict) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    with CACHE_FILE.open("w") as f:
        json.dump(cache, f, indent=2)


# ---------------------------------------------------------------------------
# Pytrends I/O
# ---------------------------------------------------------------------------

def fetch_interest(pytrends: TrendReq, kw_list: list[str]) -> pd.DataFrame:
    """One pytrends call with retry-on-429."""
    attempts = 0
    while True:
        try:
            pytrends.build_payload(kw_list, cat=0, timeframe=TIMEFRAME, geo=GEO)
            df = pytrends.interest_over_time()
            return df.drop(columns=["isPartial"], errors="ignore")
        except TooManyRequestsError:
            if attempts >= MAX_RETRIES:
                raise
            print(f"  [429] rate-limited; sleeping {RATE_LIMIT_BACKOFF}s and retrying", flush=True)
            time.sleep(RATE_LIMIT_BACKOFF)
            attempts += 1


def df_to_daily(df: pd.DataFrame, column: str) -> list[dict]:
    """Convert one pytrends column to [{date, value}, ...]."""
    if df.empty or column not in df.columns:
        return []
    return [
        {"date": idx.strftime("%Y-%m-%d"), "value": int(val)}
        for idx, val in df[column].items()
    ]


# ---------------------------------------------------------------------------
# Cross-batch normalization (Flag 1)
# ---------------------------------------------------------------------------

def normalize_team_against_baseline(
    team_name: str,
    team_in_batch: list[dict],
    ref_in_batch: list[dict],
    ref_baseline: list[dict],
) -> tuple[list[dict], list[str]]:
    """
    Normalize a single team's daily curve to the reference baseline scale.

      normalized[d] = (team_in_batch[d] / ref_in_batch[d]) * ref_baseline[d]

    Done per-day so the time-series shape is preserved. If
    ref_in_batch[d] is 0, that day cannot be normalized — we record 0
    and emit a warning. If more than ZERO_REF_DAY_WARN_THRESHOLD days
    are affected for one team, escalate to a louder flag for review.
    """
    by_team = {d["date"]: d["value"] for d in team_in_batch}
    by_ref_batch = {d["date"]: d["value"] for d in ref_in_batch}
    by_ref_baseline = {d["date"]: d["value"] for d in ref_baseline}

    normalized: list[dict] = []
    warnings: list[str] = []
    zero_ref_days = 0

    for date in sorted(by_team.keys()):
        team_val = by_team.get(date, 0)
        ref_batch_val = by_ref_batch.get(date, 0)
        ref_baseline_val = by_ref_baseline.get(date, 0)

        if ref_batch_val == 0:
            zero_ref_days += 1
            warnings.append(
                f"  [zero-ref] {team_name} on {date}: "
                f"raw_team={team_val}, ref_baseline={ref_baseline_val} "
                f"(setting normalized=0)"
            )
            normalized.append({"date": date, "value": 0})
            continue

        # Store full-precision float; downstream build_dataset.py computes
        # the mean on unrounded values and rounds at the end.
        value = (team_val / ref_batch_val) * ref_baseline_val
        normalized.append({"date": date, "value": value})

    if zero_ref_days > ZERO_REF_DAY_WARN_THRESHOLD:
        warnings.append(
            f"  [LOUD FLAG] {team_name}: {zero_ref_days}/15 days had "
            f"reference-batch=0. Normalization is unreliable; consider "
            f"rebatching with a different anchor."
        )

    return normalized, warnings


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

def load_team_list() -> list[str]:
    df = pd.read_csv(CSV_PATH)
    return [t for t in df["team"].tolist() if not t.startswith("First Four Loser")]


def validate_setup(team_list: list[str]) -> None:
    if REFERENCE_TEAM not in team_list:
        raise SystemExit(
            f"ERROR: REFERENCE_TEAM={REFERENCE_TEAM!r} is not in the loaded "
            f"team list. Pick a different reference team that's in the field."
        )
    missing = [t for t in team_list if t not in TEAM_QUERY_MAP]
    if missing:
        raise SystemExit(
            f"ERROR: TEAM_QUERY_MAP is missing entries for: {missing}. "
            f"Add them before running."
        )


def chunked(seq: list, n: int) -> list[list]:
    return [seq[i:i + n] for i in range(0, len(seq), n)]


def ensure_baseline(pytrends: TrendReq, cache: dict) -> list[dict]:
    if cache.get("baseline"):
        print(f"[baseline] cached, reusing ({REFERENCE_TEAM})")
        return cache["baseline"]["daily"]
    query = TEAM_QUERY_MAP[REFERENCE_TEAM]
    print(f"[baseline] pulling {REFERENCE_TEAM!r} alone (query={query!r})")
    df = fetch_interest(pytrends, [query])
    daily = df_to_daily(df, query)
    if not daily:
        raise SystemExit("ERROR: baseline pull returned empty; cannot continue.")
    cache["baseline"] = {"team": REFERENCE_TEAM, "query": query, "daily": daily}
    save_cache(cache)
    time.sleep(SLEEP_BETWEEN_BATCHES)
    return daily


def pull_batch(
    pytrends: TrendReq,
    others: list[str],
    ref_baseline: list[dict],
    cache: dict,
) -> None:
    ref_query = TEAM_QUERY_MAP[REFERENCE_TEAM]
    other_queries = [TEAM_QUERY_MAP[t] for t in others]
    kw_list = [ref_query] + other_queries
    print(f"[batch] {[REFERENCE_TEAM] + others}")
    try:
        df = fetch_interest(pytrends, kw_list)
    except TooManyRequestsError:
        print("  [SKIP] rate-limited twice; will retry on next run")
        return
    except Exception as e:
        print(f"  [SKIP] error: {type(e).__name__}: {e}")
        return

    ref_in_batch = df_to_daily(df, ref_query)
    if not ref_in_batch:
        print("  [SKIP] empty reference series in batch")
        return

    for team_name, team_query in zip(others, other_queries):
        team_in_batch = df_to_daily(df, team_query)
        if not team_in_batch:
            print(f"  [SKIP] {team_name}: empty series")
            continue
        normalized, warnings = normalize_team_against_baseline(
            team_name, team_in_batch, ref_in_batch, ref_baseline
        )
        for w in warnings:
            print(w)
        cache["teams"][team_name] = {
            "query": team_query,
            "hype_daily": normalized,
            "warnings": warnings,
        }
        save_cache(cache)
    time.sleep(SLEEP_BETWEEN_BATCHES)


def write_output_csv(cache: dict, team_list: list[str]) -> None:
    """
    Output: team, hype_daily (JSON-encoded list of {date, value}).
    Mean / hype_raw is computed downstream in build_dataset.py on the
    unrounded daily series.
    """
    rows = []
    # Reference team uses its baseline curve directly (it IS the anchor).
    if REFERENCE_TEAM in team_list and cache.get("baseline"):
        rows.append({
            "team": REFERENCE_TEAM,
            "hype_daily": json.dumps(cache["baseline"]["daily"]),
        })
    for team in team_list:
        if team == REFERENCE_TEAM:
            continue
        entry = cache["teams"].get(team)
        if not entry:
            continue
        rows.append({
            "team": team,
            "hype_daily": json.dumps(entry["hype_daily"]),
        })
    pd.DataFrame(rows).to_csv(OUTPUT_CSV, index=False)
    print(f"\nWrote {len(rows)} rows to {OUTPUT_CSV}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Pull Google Trends hype curves.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run on just 3 teams (plus Michigan baseline) to validate the pipeline.",
    )
    args = parser.parse_args()

    team_list = load_team_list()
    validate_setup(team_list)

    if args.dry_run:
        non_ref = [t for t in team_list if t != REFERENCE_TEAM]
        team_list = [REFERENCE_TEAM] + non_ref[:3]
        print(f"[DRY RUN] using {team_list}")

    pytrends = TrendReq(hl="en-US", tz=360)
    cache = load_cache()

    ref_baseline = ensure_baseline(pytrends, cache)

    others = [t for t in team_list if t != REFERENCE_TEAM]
    uncached = [t for t in others if t not in cache["teams"]]
    skipped = [t for t in others if t in cache["teams"]]
    if skipped:
        print(f"[cache] skipping already-cached: {skipped}")
    if not uncached:
        print("[cache] all teams cached; writing output only")
    else:
        for batch in chunked(uncached, BATCH_SIZE - 1):
            pull_batch(pytrends, batch, ref_baseline, cache)

    write_output_csv(cache, team_list)
    print(f"\nDone. Pulled at: {datetime.now(timezone.utc).isoformat()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
