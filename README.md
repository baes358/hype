# Hyp3

A single-page editorial visualization of the gap between internet hype and tournament performance for the 2026 NCAA Men's Basketball Tournament.

## Structure

```
hype/
├── data-pipeline/    Python (pytrends + pandas) — pulls hype, builds dataset
├── data/             Shared data.json output (committed; consumed by web)
└── web/              Next.js 14 app (App Router, TS, Tailwind, shadcn/ui)
```

## Data flow

Python script → `data/data.json` (committed) → Next.js imports at build time. No runtime backend.
