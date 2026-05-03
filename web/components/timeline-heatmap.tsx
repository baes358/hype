"use client";

import { Fragment, useMemo, useState } from "react";

import { Team } from "@/lib/data";

type Props = {
  teams: Team[];
  windowDates: string[];        // 15 ISO date strings, in order
  maxDailyHype: number;         // global max across the FULL dataset
  selectionSundayDate?: string; // ISO date to mark vertically; default "2026-03-15"
  selectedTeam: string | null;
  onSelect: (team: Team) => void;
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
  windowDates,
  maxDailyHype,
  selectionSundayDate = DEFAULT_SELECTION_SUNDAY,
  selectedTeam,
  onSelect,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("gap");

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => compareTeams(a, b, sortKey));
  }, [teams, sortKey]);

  if (sortedTeams.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-24 text-center text-sm text-muted-foreground sm:px-6">
        No teams match the current filters.
      </div>
    );
  }

  // Index into hype_daily by date, for safe lookup even if a team's array
  // doesn't include every window date (shouldn't happen, but defensive).
  const dateMaps = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const t of teams) {
      const inner = new Map<string, number>();
      for (const d of t.hype_daily) inner.set(d.date, d.value);
      map.set(t.team, inner);
    }
    return map;
  }, [teams]);

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-12 md:py-16">
      <header className="mb-6 flex flex-col items-start gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-normal text-muted-foreground">
            03 / The timeline
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
            Daily hype intensity for every team across the 15-day window
          </h2>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-normal text-muted-foreground">
          {sortedTeams.length} teams shown
        </div>
      </header>

      {/* Sort pill control */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[9px] uppercase tracking-normal text-muted-foreground">
          Sort
        </span>
        {SORT_OPTIONS.map((opt) => {
          const active = sortKey === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => setSortKey(opt.key)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-transparent text-muted-foreground hover:border-foreground/40 hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Heatmap grid: 1 label column + 15 day columns */}
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[680px] gap-px bg-border/60"
          style={{
            gridTemplateColumns: `minmax(140px, 180px) repeat(${windowDates.length}, minmax(28px, 1fr))`,
          }}
        >
          {/* Header row: spacer + day labels */}
          <div className="bg-background px-3 py-2 font-mono text-[9px] uppercase tracking-normal text-muted-foreground">
            Team
          </div>
          {windowDates.map((date) => {
            const isSS = date === selectionSundayDate;
            return (
              <div
                key={`hdr-${date}`}
                className={`bg-background px-1 py-2 text-center font-mono text-[9px] uppercase tracking-normal ${
                  isSS
                    ? "border-l border-l-foreground/30 text-foreground"
                    : "text-muted-foreground"
                }`}
                title={isSS ? `${fullDayLabel(date)} (Selection Sunday)` : fullDayLabel(date)}
              >
                {shortDayLabel(date)}
              </div>
            );
          })}

          {/* Body rows: team label + 15 heat cells per team */}
          {sortedTeams.map((t) => {
            const isSelected = selectedTeam === t.team;
            const inner = dateMaps.get(t.team);
            return (
              <Fragment key={t.team}>
                <button
                  onClick={() => onSelect(t)}
                  className={`flex items-center gap-2 truncate bg-background px-3 py-1.5 text-left font-mono text-[10px] uppercase tracking-normal transition hover:bg-foreground/[0.04] ${
                    isSelected ? "bg-foreground/[0.06] text-foreground" : "text-foreground"
                  }`}
                  title={`${t.team} · ${t.seed} seed · ${t.wins} wins · gap ${t.gap > 0 ? "+" : ""}${t.gap}`}
                >
                  <span className="tabular-nums text-muted-foreground">
                    {String(t.seed).padStart(2, " ")}
                  </span>
                  <span className="truncate">{t.team.toUpperCase()}</span>
                </button>
                {windowDates.map((date) => {
                  const value = inner?.get(date) ?? 0;
                  const intensity = Math.min(1, value / maxDailyHype);
                  const isSS = date === selectionSundayDate;
                  return (
                    <button
                      key={`${t.team}-${date}`}
                      onClick={() => onSelect(t)}
                      title={`${t.team} · ${fullDayLabel(date)} · hype ${value.toFixed(1)}`}
                      className={`bg-background transition hover:opacity-80 ${
                        isSS ? "border-l border-l-foreground/30" : ""
                      }`}
                      style={{
                        backgroundColor: `rgba(68, 209, 209, ${intensity})`,
                      }}
                      aria-label={`${t.team} on ${date}: hype ${value.toFixed(1)}`}
                    />
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[9px] uppercase tracking-normal text-muted-foreground">
        <span>Pale = low hype that day</span>
        <span>·</span>
        <span>Saturated teal = peak day across the dataset</span>
        <span>·</span>
        <span>Vertical line = Selection Sunday</span>
        <span>·</span>
        <span>Click any row for details</span>
      </div>
    </section>
  );
}
