# HYP3 — project memory

A 72-hour capstone project visualizing the gap between Google-Trends hype and 2026 NCAA tournament performance. This file documents conventions, decisions, and gotchas that aren't obvious from the code. Read before touching anything; update when conventions change.

## Stack (locked — do not suggest alternatives)

- Python (offline) + pytrends + pandas — data pipeline
- Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui — web app
- shadcn chart wrapper around Recharts — area chart in team detail sheet
- Vercel — hosting
- Data flow: Python → `data/data.json` (committed) → Next.js bundles it at build time. **No backend, no runtime API.**

## Directory layout

```
data-pipeline/   pull_trends.py, build_dataset.py, tournament_results.csv, venv/
data/            data.json (committed, the canonical dataset)
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

`REFERENCE_TEAM = "Michigan"`. The pipeline hard-fails if Michigan isn't in `tournament_results.csv` — pick a different reference deliberately, never auto-pick.

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

The full disambiguated map is `TEAM_QUERY_MAP` at the top of [pull_trends.py](data-pipeline/pull_trends.py). Keys must match `tournament_results.csv` exactly.

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

`build_dataset.py` uses `method="min"` for `performance_rank` ([build_dataset.py:83](data-pipeline/build_dataset.py:83)). This was a deliberate fix — `dense` rank crushes 33 tied 0-win teams to a single rank value, compresses `performance_rank` to 1–7 (only 7 distinct win counts), and breaks the gap arithmetic so that `gap < -20` is mathematically impossible. Min-rank gives the 33 zero-win teams `performance_rank = 33`, restoring meaningful gap values.

### Asymmetric story_tag thresholds

`overhyped < -15`, `underhyped > +25` (not symmetric). The asymmetry reflects the same 0-win cluster: with 33 teams tied at performance rank 33, the underhyped side fills up easily with low-hype-low-performance noise. Tighter `+25` filters that noise. Tighter overhyped `-15` (instead of original `-20`) lets the marquee 1-seed-flame-out story land in the right bucket.

Edit at [data-pipeline/build_dataset.py:35](data-pipeline/build_dataset.py:35) if the distribution feels wrong.

### `hype_raw` math

`hype_raw` is the **mean of unrounded daily values**. Rounding happens at output time only. Don't pre-aggregate in `pull_trends.py` — `raw_hype.csv` only contains `team` + `hype_daily` (the daily series); `build_dataset.py` computes the mean.

### First Four placeholders

`tournament_results.csv` has 4 placeholder rows (`First Four Loser N`) that get filled with real team names. `build_dataset.py` automatically skips rows starting with "First Four Loser". Once filled, add 4 entries to `TEAM_QUERY_MAP` and rerun the pipeline; the cache will only query the new teams.

## Frontend — non-obvious decisions

### Build-time data import (Flag 3)

`data.json` lives at `/data/data.json` (outside the Next.js app at `/web`). Importing across the boundary is fragile in production. The fix is `predev` and `prebuild` scripts in [web/package.json](web/package.json) that `cp ../data/data.json ./data.json` before each dev/build, plus a `tsconfig.json` path alias `@/* → ./*` so [lib/data.ts](web/lib/data.ts) can `import raw from "@/data.json"`.

`web/data.json` is gitignored — it's an artifact of the build, not a source.

For Vercel: enable "Include source files outside of the Root Directory in the Build Step" so the prebuild script can read `../data/data.json`.

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

### Add a team to the dataset

1. Add row to [tournament_results.csv](data-pipeline/tournament_results.csv)
2. Add entry to `TEAM_QUERY_MAP` in [pull_trends.py](data-pipeline/pull_trends.py) (apply Flag 2 rules)
3. `cd data-pipeline && ./venv/bin/python pull_trends.py` (cache skips existing teams, only queries new ones)
4. `./venv/bin/python build_dataset.py`
5. `cd ../web && npm run dev` (or build)

### Refine a team's query

1. Test variants in a Python REPL with Michigan as anchor
2. Update `TEAM_QUERY_MAP` entry
3. Delete that team from cache (snippet above)
4. Rerun `pull_trends.py` (re-queries only that team) + `build_dataset.py`

### Update the editorial finding

Edit `"finding"` in [data-pipeline/build_dataset.py:117](data-pipeline/build_dataset.py:117) (permanent — survives re-runs) or directly in [data/data.json](data/data.json) (one-off — overwritten on next pipeline run). Then `cd web && npm run build`.

### Adjust story_tag thresholds

[data-pipeline/build_dataset.py:35](data-pipeline/build_dataset.py:35), then rerun `build_dataset.py`. Print of distribution at the bottom of stdout helps tune.

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

- **Suspicious mid-major hype.** McNeese (36.74), Tennessee State (36.38), Furman (30.40) — all 0-win small schools sitting in the top 10 by mean hype. Daily curves are tournament-shaped (spikes on game day), so probably real signal, but worth re-checking if the editorial finding hinges on them. Decide: accept as-is, or do another query refinement round (the same pattern used to fix Siena/Hofstra).
- **Florida tag.** Florida has `gap = -16`, currently tagged `noise` under the `-15`/`+25` thresholds. If you want the marquee 1-seed-flame-out story to land as `overhyped`, tighten the overhyped threshold further (e.g. `< -10`) at [build_dataset.py:35](data-pipeline/build_dataset.py:35).
- **Hawaii (3.54) and St. Mary's (4.08).** Likely genuinely low signal but worth eyeballing the daily curve once before declaring them final. If the curve is tournament-shaped (spikes on game day), accept the low value as real. If it's flat noise, treat like a Siena/Hofstra refinement and test variants.
- **Custom font files not yet in repo.** `web/public/fonts/TheNeue-Black.woff2` and `web/public/fonts/FA-1-Regular.otf`. Page renders fallback chain (Helvetica Neue / system mono) until they land.

### Nice-to-haves — skip unless time

- **URL search params** so filter state and selected team survive navigation between `/` and `/bracket` (and become shareable links).
- **Sort controls** on the gap chart — by hype, by performance, by region.
- **Hover tooltips** on bars in the gap chart.
- **Search box** for finding a specific team in 64 rows.

(Brand-caps audit: README and code both confirmed clean as of 2026-05-02. Leaving the "Lowercase Hyp3" anti-pattern note above as a future safeguard.)

## Scope discipline

72-hour project. **Do not add features, refactor, or introduce abstractions beyond what was asked.** Three similar lines beats a premature abstraction. No URL params, no search, no test suite, no extra routes, no UI library swaps. If something feels missing, ask before building.
