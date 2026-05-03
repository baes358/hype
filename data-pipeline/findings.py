"""
Editorial findings per tournament year. Each entry is the headline
conclusion drawn from the year's hype-vs-performance gap analysis.

Findings are AUTHORED, not derived. They're the editorial output of looking
at the sanity tables in build_dataset.py and naming what the data is saying.
Update only after running `build_dataset.py --year YYYY --window ...` and
reviewing the printed top-overhyped, top-underhyped, and full hype rankings.

If a year is missing from FINDINGS, the pipeline writes "[finding TBD]" as
the placeholder, which the web app renders italicized in muted gray as a
visible "still to do" marker.
"""

FINDINGS: dict[int, str] = {
    2026: "HYPE vs. PERFORMANCE",
    # 2025: add after running the 2025 pipeline and reviewing sanity tables
}


def get_finding(year: int) -> str:
    return FINDINGS.get(year, "[finding TBD]")
