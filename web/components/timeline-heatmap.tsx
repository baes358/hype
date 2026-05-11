"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { FadeInSection, StaggerGroup } from "@/components/motion";
import { GapMode, Team } from "@/lib/data";

// Mobile detector. Initial render = false (SSR-safe), flips to true after
// mount on small viewports. One-frame layout shift is acceptable.
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

const MOBILE_WINDOW_SIZE = 5;

// Dark heatmap theme. The section gets a deep navy background and cells step
// through 5 discrete blue shades from low (deep navy) to peak (white).
const HEATMAP_THEME = {
  sectionBg: "#0d1f33",
  gridGap: "#1a3349",
  stickyBg: "#0d1f33",
  textPrimary: "#f0f5fa",
  textMuted: "#7d9bb5",
  borderSubtle: "rgba(255,255,255,0.15)",
  selectionDivider: "rgba(255,255,255,0.4)",
  bins: ["#1f3a52", "#345a78", "#5d96b6", "#aad0e0", "#ffffff"] as const,
} as const;

function intensityToColor(intensity: number): string {
  const idx = Math.min(4, Math.max(0, Math.floor(intensity * 5)));
  return HEATMAP_THEME.bins[idx];
}

// White rail used by the team column and the dates/months header row.
// Sits OUTSIDE the navy heatmap palette and uses dark text for readability.
const LABEL_RAIL_BG = "#ffffff";
const LABEL_RAIL_TEXT_PRIMARY = "#1c1c1b";
const LABEL_RAIL_TEXT_MUTED = "#5a6770";
const LABEL_RAIL_DIVIDER = "rgba(13, 31, 51, 0.45)";

type Props = {
  teams: Team[];
  mode: GapMode;                // tournament: daily cells; season: monthly buckets
  windowDates: string[];        // 15 ISO date strings, used in tournament mode
  maxDailyHype: number;         // global daily max, used in tournament mode
  selectionSundayDate?: string; // ISO date to mark vertically; default "2026-03-15"
  selectedTeam: string | null;
  onSelect: (team: Team) => void;
};

type Bucket = {
  key: string;       // tournament: ISO date; season: "YYYY-MM"
  label: string;     // header label (e.g. "MAR 15" or "NOV")
  tooltip: string;   // hover label (e.g. "Sunday, March 15, 2026" or "November 2025")
  isAnchor: boolean; // draws the Selection Sunday vertical divider
};

type SortKey = "gap" | "hype_rank" | "wins" | "seed" | "team";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "gap", label: "Gap" },
  { key: "hype_rank", label: "Hype" },
  { key: "wins", label: "Wins" },
  { key: "seed", label: "Seed" },
  { key: "team", label: "Team" },
];

const DEFAULT_SELECTION_SUNDAY = "2026-03-15";

function compareTeams(a: Team, b: Team, key: SortKey): number {
  switch (key) {
    case "gap":
      return a.gap - b.gap; // most overhyped (lowest gap) first
    case "hype_rank":
      return a.hype_rank - b.hype_rank; // hype_rank=1 first
    case "wins":
      return b.wins - a.wins || a.seed - b.seed; // most wins first, tie by seed
    case "seed":
      return a.seed - b.seed || a.team.localeCompare(b.team);
    case "team":
      return a.team.localeCompare(b.team);
  }
}

// Parse ISO date strings directly to avoid the local-timezone shift that
// `new Date("YYYY-MM-DD")` introduces (it reads as UTC midnight then converts).
const MONTHS_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
const WEEKDAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

function parseIso(iso: string): { year: number; month: number; day: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { year: y, month: m, day: d };
}

function shortDayLabel(iso: string): string {
  const { month, day } = parseIso(iso);
  return `${MONTHS_SHORT[month - 1]} ${day}`;
}

function fullDayLabel(iso: string): string {
  const { year, month, day } = parseIso(iso);
  // Use UTC weekday lookup so the day-of-week matches the actual ISO date,
  // independent of the viewer's timezone.
  const weekday = WEEKDAYS_FULL[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday}, ${MONTHS_FULL[month - 1]} ${day}, ${year}`;
}

export function TimelineHeatmap({
  teams,
  mode,
  windowDates,
  maxDailyHype,
  selectionSundayDate = DEFAULT_SELECTION_SUNDAY,
  selectedTeam,
  onSelect,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("gap");
  const isMobile = useIsMobile();
  const [windowStart, setWindowStart] = useState(0);

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => compareTeams(a, b, sortKey));
  }, [teams, sortKey]);

  // Build the axis and per-team values once per mode change. Tournament mode
  // is one cell per day; season mode buckets daily values by month and uses
  // the mean of each team's season_hype_daily as the cell value. The intensity
  // scale (globalMax) differs between modes, so each gets its own ramp.
  const { buckets, valueLookup, globalMax } = useMemo(() => {
    if (mode === "tournament") {
      const bs: Bucket[] = windowDates.map((date) => ({
        key: date,
        label: shortDayLabel(date),
        tooltip: fullDayLabel(date),
        isAnchor: date === selectionSundayDate,
      }));
      const lookup = new Map<string, Map<string, number>>();
      for (const t of teams) {
        const inner = new Map<string, number>();
        for (const d of t.hype_daily) inner.set(d.date, d.value);
        lookup.set(t.team, inner);
      }
      return { buckets: bs, valueLookup: lookup, globalMax: maxDailyHype };
    }

    // Season mode: bucket each team's season_hype_daily into YYYY-MM months
    // and take the mean per month. The month order is taken from the first
    // team's series (every team shares the same season window).
    const sample = teams[0]?.season_hype_daily ?? [];
    const seen = new Set<string>();
    const monthKeys: string[] = [];
    for (const d of sample) {
      const key = d.date.slice(0, 7);
      if (!seen.has(key)) {
        seen.add(key);
        monthKeys.push(key);
      }
    }
    const anchorMonth = selectionSundayDate ? selectionSundayDate.slice(0, 7) : null;
    const bs: Bucket[] = monthKeys.map((key) => {
      const [yStr, mStr] = key.split("-");
      const m = Number(mStr);
      return {
        key,
        label: MONTHS_SHORT[m - 1],
        tooltip: `${MONTHS_FULL[m - 1]} ${yStr}`,
        isAnchor: key === anchorMonth,
      };
    });

    const lookup = new Map<string, Map<string, number>>();
    let max = 0;
    for (const t of teams) {
      const sums = new Map<string, { sum: number; n: number }>();
      for (const d of t.season_hype_daily) {
        const key = d.date.slice(0, 7);
        const cur = sums.get(key) ?? { sum: 0, n: 0 };
        cur.sum += d.value;
        cur.n += 1;
        sums.set(key, cur);
      }
      const inner = new Map<string, number>();
      for (const [key, { sum, n }] of sums) {
        const mean = n > 0 ? sum / n : 0;
        inner.set(key, mean);
        if (mean > max) max = mean;
      }
      lookup.set(t.team, inner);
    }
    return { buckets: bs, valueLookup: lookup, globalMax: max || 1 };
  }, [mode, teams, windowDates, maxDailyHype, selectionSundayDate]);

  // Mobile scrubber is only meaningful in tournament mode (15 cells > 5
  // visible). Season mode shows ~5 month buckets, which all fit.
  const scrubberActive = isMobile && mode === "tournament";
  const maxWindowStart = Math.max(0, buckets.length - MOBILE_WINDOW_SIZE);
  const visibleBuckets = scrubberActive
    ? buckets.slice(windowStart, windowStart + MOBILE_WINDOW_SIZE)
    : buckets;

  if (sortedTeams.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-24 text-center text-base text-muted-foreground sm:px-6">
        No teams match the current filters.
      </div>
    );
  }

  return (
    // min-w-0 below: lets the section shrink below content width. Body is a
    // flex column; flex items default to min-width: auto, so without this
    // the heatmap grid's min-w-[680px] would expand the section past the
    // viewport and the inner overflow-x-auto never triggers (heatmap div
    // ends up the same width as its grid child).
    <section className="mx-auto min-w-0 max-w-7xl px-5 py-8 sm:px-6 sm:py-12 md:py-16">
      <FadeInSection>
        <header className="mb-6 sm:mb-8">
          <div className="text-sm uppercase tracking-[0.14em] text-graphite-soft">
            <span className="font-mono">03</span> / <span className="font-display tracking-[0.06em]">The timeline</span>
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
            {mode === "tournament"
              ? "Daily hype intensity for every team across the 15-day window"
              : "Monthly mean hype intensity for every team across the season"}
          </h2>
          <div className="mt-3 text-sm uppercase tracking-normal text-graphite-soft">
            <span className="font-mono">{sortedTeams.length}</span> teams shown
          </div>
        </header>
      </FadeInSection>

      {/* Sort segmented control */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-sm uppercase tracking-normal text-graphite-soft">
          Sort
        </span>
        <div
          role="group"
          aria-label="Sort teams by"
          className="inline-flex items-center rounded-full border border-rule bg-white/60 p-0.5"
        >
          {SORT_OPTIONS.map((opt) => {
            const active = sortKey === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSortKey(opt.key)}
                aria-pressed={active}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-all duration-150 focus-visible:outline-none ${
                  active
                    ? "bg-ink text-paper"
                    : "text-graphite-soft hover:text-ink"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile-only day scrubber. Tournament mode only — season has ~5
          monthly buckets that already fit on a phone. */}
      {scrubberActive && (
        <div className="mb-3 flex items-center gap-3 sm:hidden">
          <button
            type="button"
            onClick={() => setWindowStart((s) => Math.max(0, s - 1))}
            disabled={windowStart === 0}
            aria-label="Previous day"
            className="rounded-full border border-rule p-1.5 text-graphite-soft transition disabled:opacity-30"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <div className="flex-1 text-center font-mono text-sm uppercase tracking-normal tabular-nums text-ink">
            {visibleBuckets.length > 0 &&
              `${visibleBuckets[0].label} – ${visibleBuckets[visibleBuckets.length - 1].label}`}
          </div>
          <button
            type="button"
            onClick={() => setWindowStart((s) => Math.min(maxWindowStart, s + 1))}
            disabled={windowStart >= maxWindowStart}
            aria-label="Next day"
            className="rounded-full border border-rule p-1.5 text-graphite-soft transition disabled:opacity-30"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      )}

      {/* Heatmap grid: 1 label column + N day columns. Mobile shows a 5-day
          window (sm:min-w-[680px] only enforces the wide-grid scroll behavior
          on desktop). max-w is viewport-minus-section-padding so the scroller's
          width doesn't depend on the grid's content. */}
      <FadeInSection delay={0.1} className="w-full max-w-[calc(100vw-2.5rem)] overflow-x-auto sm:max-w-[calc(100vw-3rem)]">
        <div
          // --label-col controls the team-name column width; narrower on mobile
          // so the heat cells get more room, full width on sm+. The mobile
          // minimum is sized to fit common team names on one line; longer
          // multi-word names wrap onto a second line.
          className="grid gap-px [--label-col:minmax(104px,128px)] sm:min-w-[680px] sm:[--label-col:minmax(120px,180px)]"
          style={{
            gridTemplateColumns: `var(--label-col) repeat(${visibleBuckets.length}, minmax(28px, 1fr))`,
            backgroundColor: HEATMAP_THEME.gridGap,
          }}
        >
          {/* Header row: spacer + axis labels (day in tournament mode, month in season mode) */}
          <div
            className="sticky left-0 z-10 px-3 py-2 text-sm uppercase tracking-normal shadow-[4px_0_6px_-2px_rgba(0,0,0,0.15)]"
            style={{ backgroundColor: LABEL_RAIL_BG, color: LABEL_RAIL_TEXT_MUTED }}
          >
            Team
          </div>
          {visibleBuckets.map((b) => (
            <div
              key={`hdr-${b.key}`}
              className="px-1 py-2 text-center font-mono text-xs uppercase tracking-normal"
              style={{
                backgroundColor: LABEL_RAIL_BG,
                color: b.isAnchor ? LABEL_RAIL_TEXT_PRIMARY : LABEL_RAIL_TEXT_MUTED,
                borderLeft: b.isAnchor ? `1px solid ${LABEL_RAIL_DIVIDER}` : undefined,
              }}
              title={b.isAnchor ? `${b.tooltip} (Selection Sunday)` : b.tooltip}
            >
              {b.label}
            </div>
          ))}

          {/* Body rows: team label + heat cells per team */}
          {sortedTeams.map((t) => {
            const isSelected = selectedTeam === t.team;
            const inner = valueLookup.get(t.team);
            return (
              <Fragment key={t.team}>
                <button
                  onClick={() => onSelect(t)}
                  // Mobile: stack seed above team name, left-aligned, larger seed.
                  // sm+: original side-by-side row.
                  className="sticky left-0 z-10 flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm shadow-[4px_0_6px_-2px_rgba(0,0,0,0.15)] transition hover:opacity-80 sm:flex-row sm:items-center sm:gap-2"
                  style={{
                    backgroundColor: isSelected ? "rgba(58,59,59,0.18)" : LABEL_RAIL_BG,
                    color: LABEL_RAIL_TEXT_PRIMARY,
                  }}
                  title={`${t.team} · ${t.seed} seed · ${t.wins} wins · gap ${t.gap > 0 ? "+" : ""}${t.gap}`}
                >
                  <span className="font-mono tabular-nums text-base text-brand sm:text-sm">
                    {String(t.seed).padStart(2, "0")}
                  </span>
                  <span className="w-full break-words leading-tight sm:truncate sm:leading-normal">{t.team}</span>
                </button>
                {visibleBuckets.map((b) => {
                  const value = inner?.get(b.key) ?? 0;
                  const intensity = Math.min(1, value / globalMax);
                  return (
                    <button
                      key={`${t.team}-${b.key}`}
                      onClick={() => onSelect(t)}
                      title={`${t.team} · ${b.tooltip} · ${mode === "tournament" ? "hype" : "mean hype"} ${value.toFixed(1)}`}
                      className="transition hover:opacity-80"
                      style={{
                        backgroundColor: intensityToColor(intensity),
                        borderLeft: b.isAnchor ? `1px solid ${HEATMAP_THEME.selectionDivider}` : undefined,
                      }}
                      aria-label={`${t.team} · ${b.tooltip}: ${value.toFixed(1)}`}
                    />
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      </FadeInSection>

      <StaggerGroup
        staggerMs={50}
        delay={0.2}
        className="mt-4 flex flex-col items-start gap-y-1 text-sm uppercase tracking-normal text-graphite-soft"
      >
        <span>Deep navy = low hype that day</span>
        <span>White = peak day across the dataset</span>
        <span>
          {mode === "tournament"
            ? "Vertical line = Selection Sunday"
            : "Vertical line = Selection Sunday's month"}
        </span>
        <span>Click any row for details</span>
      </StaggerGroup>
    </section>
  );
}
