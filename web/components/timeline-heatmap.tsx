"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { GapMode, StoryTag, Team } from "@/lib/data";

const TAG_COLOR: Record<StoryTag, string> = {
  overhyped: "#f995b6",
  underhyped: "#66e7d8",
  as_expected: "#efecaf",
  noise: "#b4b4ef",
};

// Deep navy → glowing core bright. 9-stop ramp.
const HEAT_STOPS = [
  "#0d1622",
  "#13243a",
  "#1a3253",
  "#1f4673",
  "#26649b",
  "#3c8acb",
  "#72b8ff",
  "#a0d0ff",
  "#dceaff",
] as const;

function cellColor(intensity: number): string {
  const idx = Math.min(
    HEAT_STOPS.length - 1,
    Math.floor(intensity * HEAT_STOPS.length)
  );
  return HEAT_STOPS[idx];
}

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

type Props = {
  teams: Team[];
  mode: GapMode;
  windowDates: string[];
  maxDailyHype: number;
  selectionSundayDate?: string;
  selectedTeam: string | null;
  onSelect: (team: Team) => void;
};

type Bucket = {
  key: string;
  label: string;
  tooltip: string;
  isAnchor: boolean;
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

const MONTHS_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
const WEEKDAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { year: y, month: m, day: d };
}

function shortDayLabel(iso: string) {
  const { month, day } = parseIso(iso);
  return `${MONTHS_SHORT[month - 1]} ${day}`;
}

function fullDayLabel(iso: string) {
  const { year, month, day } = parseIso(iso);
  const weekday = WEEKDAYS_FULL[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday}, ${MONTHS_FULL[month - 1]} ${day}, ${year}`;
}

function compareTeams(a: Team, b: Team, key: SortKey): number {
  switch (key) {
    case "gap":       return a.gap - b.gap;
    case "hype_rank": return a.hype_rank - b.hype_rank;
    case "wins":      return b.wins - a.wins || a.seed - b.seed;
    case "seed":      return a.seed - b.seed || a.team.localeCompare(b.team);
    case "team":      return a.team.localeCompare(b.team);
  }
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

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => compareTeams(a, b, sortKey)),
    [teams, sortKey]
  );

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

  const scrubberActive = isMobile && mode === "tournament";
  const maxWindowStart = Math.max(0, buckets.length - MOBILE_WINDOW_SIZE);
  const visibleBuckets = scrubberActive
    ? buckets.slice(windowStart, windowStart + MOBILE_WINDOW_SIZE)
    : buckets;

  if (sortedTeams.length === 0) {
    return (
      <div className="mx-auto max-w-[1440px] px-5 py-24 text-center text-base text-ink-2 sm:px-7">
        No teams match the current filters.
      </div>
    );
  }

  return (
    <section
      className="relative mx-auto min-w-0 max-w-[1440px]"
      style={{
        padding:
          "clamp(2.5rem, 6vw, 4.5rem) clamp(1.25rem, 4vw, 2rem) clamp(3rem, 7vw, 5rem)",
      }}
    >
      <header className="mb-10 flex flex-col gap-6 md:mb-12 md:flex-row md:flex-wrap md:items-end md:justify-between md:gap-8">
        <div>
          <div className="mb-3 font-mono text-sm uppercase tracking-[0.14em] text-ink-2">
            <span className="text-core-bright">03</span> /{" "}
            <span className="text-ink-1">The Timeline</span>
          </div>
          <h2
            className="m-0 max-w-[720px] font-display font-bold leading-[1.1] tracking-[-0.01em] text-ink"
            style={{ fontSize: "clamp(22px, 2.6vw, 34px)" }}
          >
            Daily hype intensity for every team across the{" "}
            <span
              style={{
                color: "transparent",
                WebkitTextStroke: "1.2px var(--core-bright)",
              }}
            >
              15-day window
            </span>
          </h2>
          <div className="mt-3 font-mono text-sm uppercase tracking-[0.1em] text-ink-2">
            <span className="text-ink">{sortedTeams.length}</span> teams ·
            vertical line = Selection Sunday
          </div>
        </div>

        {/* Sort */}
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-sm uppercase tracking-[0.18em] text-ink-3">
            SORT
          </span>
          <div className="inline-flex w-fit max-w-full flex-wrap rounded-full border border-border bg-[rgba(255,255,255,0.025)] p-[3px]">
            {SORT_OPTIONS.map((opt) => {
              const active = sortKey === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSortKey(opt.key)}
                  aria-pressed={active}
                  className={`inline-flex min-h-11 items-center rounded-full px-3 py-1 font-mono text-sm uppercase tracking-[0.06em] transition-all ${
                    active
                      ? "bg-[rgba(255,255,255,0.08)] text-ink"
                      : "text-ink-1 hover:text-ink"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {scrubberActive && (
        <div className="mb-3 flex items-center gap-3 sm:hidden">
          <button
            type="button"
            onClick={() => setWindowStart((s) => Math.max(0, s - 1))}
            disabled={windowStart === 0}
            aria-label="Previous day"
            className="rounded-full border border-border p-1.5 text-ink-2 disabled:opacity-30"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <div className="flex-1 text-center font-mono text-sm uppercase tabular-nums text-ink">
            {visibleBuckets.length > 0 &&
              `${visibleBuckets[0].label} – ${visibleBuckets[visibleBuckets.length - 1].label}`}
          </div>
          <button
            type="button"
            onClick={() => setWindowStart((s) => Math.min(maxWindowStart, s + 1))}
            disabled={windowStart >= maxWindowStart}
            aria-label="Next day"
            className="rounded-full border border-border p-1.5 text-ink-2 disabled:opacity-30"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-[14px] border border-border bg-bg-1">
        <div className="w-full overflow-x-auto">
          <div
            className="grid min-w-[680px] gap-px"
            style={{
              gridTemplateColumns: `200px repeat(${visibleBuckets.length}, minmax(28px, 1fr)) 60px`,
              backgroundColor: "rgba(255,255,255,0.04)",
            }}
          >
            {/* Header row */}
            <div className="flex items-center bg-black/40 px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
              TEAM
            </div>
            {visibleBuckets.map((b, i) => (
              <div
                key={`hdr-${b.key}`}
                title={b.isAnchor ? `${b.tooltip} (Selection Sunday)` : b.tooltip}
                className="flex items-center justify-center bg-black/40 px-1 py-2 font-mono text-[9px] uppercase tracking-[0.06em]"
                style={{
                  color: b.isAnchor ? "var(--core-bright)" : "var(--ink-2)",
                  borderLeft: b.isAnchor ? "1px solid rgba(114,184,255,0.6)" : undefined,
                  marginLeft: i === 0 ? undefined : 0,
                }}
              >
                {b.label}
              </div>
            ))}
            <div className="flex items-center justify-center border-l border-border bg-black/40 font-mono text-[10px] text-ink-2">
              ±
            </div>

            {/* Body rows */}
            {sortedTeams.map((t) => {
              const isSel = selectedTeam === t.team;
              const inner = valueLookup.get(t.team);
              return (
                <Fragment key={t.team}>
                  <button
                    type="button"
                    onClick={() => onSelect(t)}
                    className={`flex min-h-11 items-center gap-2 px-3.5 py-1 text-left transition ${
                      isSel ? "bg-[rgba(114,184,255,0.06)]" : "bg-transparent"
                    }`}
                  >
                    <span className="font-mono text-sm tabular-nums text-core-bright">
                      {String(t.seed).padStart(2, "0")}
                    </span>
                    <span className="truncate font-sans text-sm text-ink">
                      {t.team}
                    </span>
                  </button>
                  {visibleBuckets.map((b) => {
                    const value = inner?.get(b.key) ?? 0;
                    const intensity = Math.min(1, value / globalMax);
                    const bg = cellColor(intensity);
                    return (
                      <button
                        key={`${t.team}-${b.key}`}
                        type="button"
                        onClick={() => onSelect(t)}
                        title={`${t.team} · ${b.tooltip} · ${value.toFixed(1)}`}
                        className="transition hover:opacity-80"
                        style={{
                          backgroundColor: bg,
                          boxShadow:
                            intensity > 0.75 ? `0 0 12px ${bg}99` : "none",
                          borderLeft: b.isAnchor
                            ? "1px solid rgba(114,184,255,0.6)"
                            : undefined,
                          margin: "6px 2px",
                          borderRadius: 3,
                          minHeight: 32,
                        }}
                        aria-label={`${t.team} · ${b.tooltip}: ${value.toFixed(1)}`}
                      />
                    );
                  })}
                  <div
                    className="flex min-h-11 items-center justify-center border-l border-border bg-transparent font-mono text-sm font-bold tabular-nums"
                    style={{ color: TAG_COLOR[t.story_tag] }}
                  >
                    {t.gap > 0 ? `+${t.gap}` : t.gap}
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Color scale */}
      <div className="mt-4 inline-flex items-center gap-1">
        <span className="mr-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
          LOW
        </span>
        {Array.from({ length: 9 }).map((_, i) => (
          <span
            key={i}
            className="h-3 w-5.5 rounded-[2px]"
            style={{ background: cellColor(i / 8), width: 22 }}
          />
        ))}
        <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
          PEAK
        </span>
      </div>
    </section>
  );
}
