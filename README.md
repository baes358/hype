# HYP3

A single-page editorial visualization of the gap between internet hype and tournament performance for the 2026 NCAA Men's Basketball Tournament. The thesis: measure how much the most-loved teams over- or under-performed expectations, then present the finding as a polished editorial chart.

## Stack

| Layer | Tool |
|---|---|
| Hype data | Python + pytrends + pandas (offline, run once per refresh) |
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui |
| Charts | Recharts (via shadcn chart wrapper) for the team detail area chart; CSS for the diverging bar chart |
| Hosting | Vercel |
| Data flow | Python script → `data/data.json` (committed) → Next.js imports at build time. No backend, no runtime API. |

## Repo layout

```
hype/
├── data-pipeline/             Python — pulls hype from Google Trends, builds dataset
│   ├── pull_trends.py         Trends pull with cross-batch normalization
│   ├── build_dataset.py       Joins CSV + raw hype, computes ranks/gap/story_tag
│   ├── tournament_results.csv 68-team bracket source of truth
│   ├── requirements.txt
│   └── venv/                  (gitignored)
├── data/
│   └── data.json              Canonical dataset consumed by the web app
└── web/                       Next.js 16 app
    ├── app/
    │   ├── page.tsx           / — diverging gap chart
    │   ├── bracket/page.tsx   /bracket — region grid
    │   ├── layout.tsx         Fonts + global metadata
    │   └── globals.css        Tailwind theme + custom @font-face
    ├── components/            App shell + section components
    ├── lib/data.ts            Typed dataset + color tokens
    └── public/fonts/          Drop custom font files here
```

## Quick start

### Pull hype + build dataset

```bash
cd data-pipeline
./venv/bin/python pull_trends.py            # full 68-team pull (uses cache for re-runs)
./venv/bin/python pull_trends.py --dry-run  # 3-team smoke test
./venv/bin/python build_dataset.py          # produces ../data/data.json + sanity tables
```

### Run the web app

```bash
cd web
npm install
npm run dev      # localhost:3000
npm run build    # production build
```

`predev` and `prebuild` scripts copy `data/data.json` → `web/data.json` so it bundles into the Next.js build.

## Editorial system

Each team gets a `story_tag` derived from the gap between its hype rank and its performance rank:

| Tag | Rule | Meaning |
|---|---|---|
| `overhyped` | `gap < -15` | Got more hype than wins justified |
| `underhyped` | `gap > +25` | Performed deeper than the internet noticed |
| `as_expected` | `abs(gap) <= 10` | Hype matched performance |
| `noise` | otherwise | Neither a story nor expected — small school, low signal |

Asymmetric thresholds reflect the structural fact that the underhyped side of the distribution is fed by 33 teams tied at 0 wins, so a tighter cutoff there filters out non-stories.

## Deploy

Vercel auto-deploys on push to `main`. Set Vercel project's **Root Directory** to `web/` so it picks up the Next.js app, and enable "Include source files outside of the Root Directory" so the prebuild script can read `../data/data.json`.

## Brand

- **Name:** HYP3 (always all caps)
- **Accent:** `#44D1D1` (centralized as `--brand` in `web/app/globals.css`)
- **Display font:** Neue Black (drop `web/public/fonts/TheNeue-Black.woff2`)
- **Body font:** Host Grotesk, weight 500 (Google Fonts)
- **Mono / labels:** FA-1 Regular (drop `web/public/fonts/FA-1-Regular.otf`)
