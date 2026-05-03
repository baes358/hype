# HYP3 — project memory

A 72-hour capstone project visualizing the gap between Google-Trends hype and 2026 NCAA tournament performance. This file documents conventions, decisions, and gotchas that aren't obvious from the code. Read before touching anything; update when conventions change.

## Stack (locked — do not suggest alternatives)

- Python (offline) + pytrends + pandas — data pipeline
- Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui — web app
- shadcn chart wrapper around Recharts — area chart in team detail sheet
- Vercel — hosting
- Data flow: Python → `data/<year>.json` (committed) → Next.js bundles `data/2026.json` at build time. **No backend, no runtime API.** (Multi-year data exists on disk; the web app currently bundles only 2026.)

## Directory layout

```
data-pipeline/   pull_trends.py, build_dataset.py, tournament_results_<year>.csv, venv/
data/            <year>.json (committed; one file per tournament year)
web/             Next.js app. See web/CLAUDE.md for Next 16 quirks.
```

## Data pipeline — non-obvious decisions

### Cross-batch normalization (Flag 1 — non-negotiable)

Google Trends scores 0–100 are normalized **within a single query**, so values from different batches are not directly comparable. The pipeline anchors every batch with a reference team (Michigan), pulls a dedicated baseline curve once, then rescales every other team:

```
normalized[d] = (team_in_batch[d] / ref_in_batch[d]) * ref_baseline[d]
```

Done per-day so the time-series shape is preserved. Lives in [data-pipeline/pull_trends.py](data-pipeline/pull_trends.py) — `normalize_team_against_baseline()`.

If `ref_in_batch[d]` is 0, that day is set to 0 with a `[zero-ref]` warning. If more than 3 days are zero-ref for a team, a `[LOUD FLAG]` warning fires for manual review.

The reference team is passed via `--reference` (defaults to `"Michigan"` for 2026 backward compat). The pipeline hard-fails if the reference isn't in the year's `tournament_results_<year>.csv` — pick a different reference deliberately for each year, never auto-pick.

**Reference team selection rule:** the reference must have a non-zero baseline on every day of the hype window. If the baseline collapses to zero on any day, the in-batch denominator goes to zero and the cross-batch math explodes — producing 4-digit hype values for teams that should be in the 0-200 range (the McNeese-2025 incident: see commit history for 2026-05-03). The eventual champion is usually the safest pick because their search volume sustains across the entire window. For 2025, Auburn (overall #1 seed) had two zero-baseline days and was unusable; Florida (champion) had a min-baseline of 3 across the same window and worked cleanly. **Before kicking off a full pull for a new year, do a standalone single-team probe of your candidate reference and verify min > 0:**

```python
from pytrends.request import TrendReq
p = TrendReq(hl="en-US", tz=360)
p.build_payload(["Florida Gators basketball"], cat=0, timeframe="2025-03-11 2025-03-25", geo="US")
df = p.interest_over_time().drop(columns=["isPartial"], errors="ignore")
print(df.iloc[:, 0].min())  # must be > 0
```

If min == 0, pick another team. For unfinished tournaments (no champion yet), use a 1-seed with sustained pre-tournament hype that you've spot-checked has min > 0.

### Query string disambiguation (Flag 2)

The naive query "Texas basketball" picks up football noise, "Michigan basketball" picks up state news, etc. But "Texas Longhorns basketball" works while "Saint Mary's Gaels basketball" returns **all zeros** because the long mascot phrase has no Trends index. The rule learned the hard way:

- **Keep the mascot** for state-name and common-word teams (Texas, Houston, Florida, Kansas, Michigan, Tennessee, Alabama, etc.) — risk is contamination
- **Drop the mascot** for unique-name small/mid schools (St. John's, McNeese, Furman, Hofstra, Siena, etc.) — risk is zero signal
- **Always strip apostrophes and periods** in queries — "St. John's" → `"St Johns basketball"`, "Saint Mary's" → `"Saint Marys basketball"`. Apostrophes break Trends.
- **Use the colloquial school name when ambiguous with another famous school** — Penn → `"Penn Quakers basketball"` (not "Pennsylvania Quakers", which collides with Penn State and the state of Pennsylvania)
- **Special cases discovered the hard way:**
  - Hofstra → `"Hofstra University basketball"` (bare "Hofstra basketball" picks up the famous debate venue)
  - Siena → `"Siena College basketball"` (bare "Siena basketball" picks up Italian city / Sienna brand)
  - LIU (Long Island) → `"LIU basketball"` (school rebranded from Blackbirds to Sharks; "LIU" is the searchable form)
  - McNeese → `"McNeese basketball"` (school dropped "State" branding in 2023)
  - Tennessee State → `"Tennessee State University basketball"` (bare "Tennessee State basketball" bleeds Tennessee Vols / state news; baseline 19-33 on quiet days vs. 0 with the suffix. Mascot variant `"Tennessee State Tigers basketball"` returns near-zero — Tigers is too generic across NCAA programs)

The full disambiguated map is `TEAM_QUERY_MAP` at the top of [pull_trends.py](data-pipeline/pull_trends.py). Keys must match the team name in `tournament_results_<year>.csv` exactly. The map is shared across years — if a team appears in multiple years' CSVs, one entry covers all of them.

### Cache is by team, baseline is separate

[data-pipeline/cache/raw_trends.json](data-pipeline/cache/) (gitignored) keys by team. Re-runs only re-query missing teams. The Michigan baseline lives separately and is only re-pulled if the cache file is deleted entirely.

To force a re-pull of one team (e.g. after changing its query string):

```python
import json
from pathlib import Path
p = Path("cache/raw_trends.json")
c = json.loads(p.read_text())
c["teams"].pop("TeamName", None)
p.write_text(json.dumps(c, indent=2))
```

### `min` rank for performance, not `dense`

`build_dataset.py` uses `method="min"` for `performance_rank` ([build_dataset.py:136](data-pipeline/build_dataset.py:136)). This was a deliberate fix — `dense` rank crushes 33 tied 0-win teams to a single rank value, compresses `performance_rank` to 1–7 (only 7 distinct win counts), and breaks the gap arithmetic so that `gap < -20` is mathematically impossible. Min-rank gives the 33 zero-win teams `performance_rank = 33`, restoring meaningful gap values.

### Asymmetric story_tag thresholds

`overhyped <= -15`, `underhyped > +25` (not symmetric). The asymmetry reflects the same 0-win cluster: with 33 teams tied at performance rank 33, the underhyped side fills up easily with low-hype-low-performance noise. Tighter `+25` filters that noise. Overhyped `<= -15` (originally `< -20`, then `< -15`, finally `<= -15` on 2026-05-03) lets the marquee 1-seed-flame-out story land in the right bucket — Florida sat at gap=-15 exactly, and inclusive `<=` was the smallest change that captured it.

Edit at [data-pipeline/build_dataset.py:69](data-pipeline/build_dataset.py:69) if the distribution feels wrong.

### `hype_raw` math

`hype_raw` is the **mean of unrounded daily values**. Rounding happens at output time only. Don't pre-aggregate in `pull_trends.py` — `raw_hype_<year>.csv` only contains `team` + `hype_daily` (the daily series); `build_dataset.py` computes the mean.

### First Four placeholders

`tournament_results_<year>.csv` may contain 4 placeholder rows (`First Four Loser N`) when the bracket is fetched before the First Four games complete. `build_dataset.py` automatically skips rows starting with "First Four Loser". Once filled with real team names, add 4 entries to `TEAM_QUERY_MAP` and rerun the pipeline; the cache will only query the new teams. (Note: `fetch_bracket.py` fills these from the NCAA API automatically — no placeholders unless the bracket is fetched mid-tournament.)

### Logos and the seoname map

`fetch_bracket.py` writes `cache/seonames_<year>.json` (a `{canonical_team_name: seoname_slug}` dict) alongside the CSV. This is the bridge between two downstream consumers:

- `fetch_logos.py` reads the seoname map and downloads `https://ncaa-api.henrygd.me/logo/<slug>.svg` into `web/public/logos/<slug>.svg`. Skips files that already exist locally (re-runs are cheap). Logs and continues on 404.
- `build_dataset.py` reads the seoname map and sets `logo_path: "/logos/<slug>.svg"` per team in `data.json`, but **only if the SVG file actually exists on disk** — else `logo_path: null`. This means `build_dataset.py` is robust to running without `fetch_logos.py` (logo_path is just null for everyone) and robust to logos that 404'd during fetch.

`web/public/logos/` IS committed (1.3 MB of SVGs for 68 teams). Vercel serves them as static assets. The frontend doesn't currently consume `logo_path` — the field exists for future UI work without forcing another pipeline run.

### First Four win counting

**Every `isWinner: true` counts toward a team's `wins` total, including First Four wins** — a play-in win is a tournament win regardless of what happens next. Texas (FF win + 2 main bracket wins = 3 wins) and Howard (FF win, lost in R64 = 1 win) both have their FF wins credited.

This was discovered via NCAA API cross-validation on 2026-05-03: the manually-transcribed 2026 CSV had Howard, Miami (OH), and Prairie View A&M all at `wins=0` (FF wins not counted), while Texas was at `wins=3` (FF win counted). The API counts uniformly. The 2026 CSV was corrected to match — three teams bumped from 0 to 1 wins. This shifted 9 teams' `story_tag` and properly tagged Florida as `overhyped` (it had been `noise` due to the threshold landing exactly at the previous gap value).

Going forward, `fetch_bracket.py` writes uniform API counts and the manual transcription path is deprecated.

## Frontend — non-obvious decisions

### Build-time data import (Flag 3)

Year datasets live at `/data/<year>.json` (outside the Next.js app at `/web`). Importing across the boundary is fragile in production. The fix is `predev` and `prebuild` scripts in [web/package.json](web/package.json) that `cp ../data/2026.json ./data.json` before each dev/build, plus a `tsconfig.json` path alias `@/* → ./*` so [lib/data.ts](web/lib/data.ts) can `import raw from "@/data.json"`.

The web app's import target is `web/data.json` regardless of which year is bundled — only the SOURCE path (`../data/2026.json`) changes if the bundled year ever changes. `web/data.json` is gitignored — it's a build artifact, not a source.

For Vercel: enable "Include source files outside of the Root Directory in the Build Step" so the prebuild script can read `../data/<year>.json`.

### File map

| File | Purpose |
|---|---|
| [web/app/page.tsx](web/app/page.tsx) | `/` — server, mounts `<AppShell view="gap">` |
| [web/app/bracket/page.tsx](web/app/bracket/page.tsx) | `/bracket` — server, mounts `<AppShell view="bracket">` |
| [web/app/layout.tsx](web/app/layout.tsx) | Loads Host Grotesk + sets metadata |
| [web/app/globals.css](web/app/globals.css) | Tailwind theme + `@font-face` for Neue Black + FA-1 + light-mode color tokens |
| [web/lib/data.ts](web/lib/data.ts) | Typed `Dataset`/`Team`/`StoryTag` + `TAG_STYLE` color tokens |
| [web/components/app-shell.tsx](web/components/app-shell.tsx) | Client wrapper holding filter + selection state, `view` prop switches between gap/bracket sections |
| [web/components/hero.tsx](web/components/hero.tsx) | Top meta strip + "[finding TBD]" headline |
| [web/components/section-nav.tsx](web/components/section-nav.tsx) | Bloomberg-style sub-nav between routes |
| [web/components/filters.tsx](web/components/filters.tsx) | story_tag + region pills |
| [web/components/gap-chart.tsx](web/components/gap-chart.tsx) | Diverging horizontal bar chart (CSS, not Recharts) |
| [web/components/bracket-grid.tsx](web/components/bracket-grid.tsx) | 4-region grid of teams sorted by seed |
| [web/components/team-sheet.tsx](web/components/team-sheet.tsx) | shadcn Sheet with daily area chart + stat block |

### Filter state is page-local

State (selected tags, selected region, selected team) lives in `<AppShell>` and resets when navigating between `/` and `/bracket`. Intentional simplicity for v1. If users complain, lift to URL search params — that also gives shareable links.

### Bar / meter scaling is anchored to the FULL dataset

When filters narrow the visible teams, bars/meters still scale to `maxAbsGap(allTeams)`, not the filtered subset. Otherwise filtering rescales the visualization and breaks visual comparison across views.

### Brand & typography conventions

| Token | Value | Where |
|---|---|---|
| Brand color | `#44D1D1` | `--brand` CSS var → `bg-brand`/`text-brand` Tailwind utility |
| Body font | Host Grotesk weight 500 | Google Fonts via `next/font/google`, default body class is `font-medium` |
| Display font | Neue Black | `@font-face` from `web/public/fonts/TheNeue-Black.woff2`. Auto-applies to `h1`–`h6` and `.font-display` via `globals.css` `@layer base` |
| Mono / labels | FA-1 Regular | `@font-face` from `web/public/fonts/FA-1-Regular.otf`. Used wherever `font-mono` is applied. `tracking-normal` (not letter-spaced) |
| Story tag colors | rose/sky/amber/zinc | Centralized in `TAG_STYLE` in [lib/data.ts](web/lib/data.ts) |

The app forces light mode (white bg, `#3A3B3B` text). The `dark` class is removed from `<html>` and the `.dark` block in `globals.css` is unused.

### Brand caps

The brand is **HYP3**, always all-caps. Never "Hyp3", "hyp3", "Hype3". Search/replace if a lowercase variant ever lands.

### TAG_STYLE is the single retheming surface

To retheme story_tag colors (or invert which tag is "danger" coded), edit `TAG_STYLE` in [lib/data.ts](web/lib/data.ts). All components consume from there. Three inline color refs that bypass it (rose/sky used as semantic +/− indicators in gap-chart and bracket-grid) are intentional — they encode direction independent of the tag color.

## Common workflows

The pipeline is year-parameterized as of 2026-05-03. Both `pull_trends.py` and `build_dataset.py` REQUIRE `--year` and `--window` (no year-less default exists). CSVs, caches, and outputs are all year-suffixed: `tournament_results_<year>.csv`, `cache/raw_trends_<year>.json`, `raw_hype_<year>.csv`, `data/<year>.json`.

### Add a team to a year's dataset

1. Add row to `tournament_results_<year>.csv` (e.g. [tournament_results_2026.csv](data-pipeline/tournament_results_2026.csv))
2. Add entry to `TEAM_QUERY_MAP` in [pull_trends.py](data-pipeline/pull_trends.py) (apply Flag 2 rules). The map is shared across years — if a team is in multiple years' CSVs, one entry covers them all.
3. `cd data-pipeline && ./venv/bin/python pull_trends.py --year YYYY --window YYYY-MM-DD:YYYY-MM-DD` (cache skips existing teams, only queries new ones)
4. `./venv/bin/python build_dataset.py --year YYYY --window YYYY-MM-DD:YYYY-MM-DD`
5. `cd ../web && npm run dev` (or build)

### Refine a team's query

1. Test variants in a Python REPL with the year's reference team as anchor
2. Update `TEAM_QUERY_MAP` entry in [pull_trends.py](data-pipeline/pull_trends.py)
3. Delete that team from `cache/raw_trends_<year>.json` (snippet below)
4. Rerun `pull_trends.py --year YYYY --window ...` (re-queries only that team) + `build_dataset.py --year YYYY --window ...`

```python
import json
from pathlib import Path
p = Path("cache/raw_trends_2026.json")
c = json.loads(p.read_text())
c["teams"].pop("TeamName", None)
p.write_text(json.dumps(c, indent=2))
```

### Update the editorial finding

Findings are authored, not derived. Edit the `FINDINGS` dict in [data-pipeline/findings.py](data-pipeline/findings.py) — one entry per year, e.g. `2026: "HYPE vs. PERFORMANCE"`. Years not in the dict get `"[finding TBD]"` automatically (rendered italicized + muted in the hero as a visible "still to do" marker).

Then rerun `build_dataset.py --year YYYY --window ...` and `cd web && npm run build`.

Do **not** edit `data/<year>.json` directly — `build_dataset.py` regenerates it from CSV + raw_hype + findings.py and will overwrite manual edits. The findings module is the single source of truth.

### Adjust story_tag thresholds

[data-pipeline/build_dataset.py:69](data-pipeline/build_dataset.py:69), then rerun `build_dataset.py --year YYYY --window ...`. Print of distribution at the bottom of stdout helps tune.

### --window format

Always `YYYY-MM-DD:YYYY-MM-DD` (colon-separated). The validator strictly rejects space-separated input, partial dates, and any window length other than 15 days inclusive. Internal conversion to pytrends' space-separated format happens at the use-site only — the canonical form on the CLI is colon-separated.

## Anti-patterns — do not suggest

- **Mascot in queries for low-volume schools** — returns 0. Drop the mascot.
- **Mascot-less queries for state-name schools** — picks up state news, football, weather. Keep the mascot.
- **Apostrophes in query strings** — Trends mishandles them. Strip.
- **`dense` rank for `performance_rank`** — breaks the gap arithmetic. Always `min`.
- **Pre-aggregating `hype_raw` in `pull_trends.py`** — keep daily series only; aggregate in `build_dataset.py` on unrounded values.
- **Importing `data.json` from outside `/web` in production** — use the prebuild copy script.
- **Symmetric story_tag thresholds** — the 33-team 0-win cluster makes the underhyped side too easy.
- **Adding URL search params, search box, or sort controls** without being asked. v1 is intentionally minimal.
- **Mocking dependencies or writing tests** — explicit no-test policy for the 72-hour scope.
- **Lowercase "Hyp3"** — brand is HYP3 caps.

## Open follow-ups

### Should consider — data quality + setup

- **NCAA API name normalization map will need maintenance over time.** The map in `fetch_bracket.py` translates the API's current branding (e.g. `McNeese`, `Queens (N.C.)`) to our historical CSV form (`McNeese State`, `Queens`). Schools occasionally rebrand: McNeese dropped "State" in 2023, future years' API responses will reflect that. When fetching a new year, watch for a "would be NEW team names" warning and decide whether to add a normalization entry (preserve the historical canonical name) or update `TEAM_QUERY_MAP` keys (adopt the new name). Both are valid; the choice depends on whether you want consistency with prior years' data.

### Nice-to-haves — skip unless time

- **URL search params** so filter state and selected team survive navigation between `/` and `/bracket` (and become shareable links).
- **Sort controls** on the gap chart — by hype, by performance, by region.
- **Hover tooltips** on bars in the gap chart.
- **Search box** for finding a specific team in 64 rows.

(Brand-caps audit: README and code both confirmed clean as of 2026-05-02. Leaving the "Lowercase Hyp3" anti-pattern note above as a future safeguard.)

## Scope discipline

72-hour project. **Do not add features, refactor, or introduce abstractions beyond what was asked.** Three similar lines beats a premature abstraction. No URL params, no search, no test suite, no extra routes, no UI library swaps. If something feels missing, ask before building.
