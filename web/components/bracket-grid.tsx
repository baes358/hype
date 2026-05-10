"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { FadeInSection, StaggerGroup } from "@/components/motion";
import { Region, REGIONS, Team, TAG_STYLE } from "@/lib/data";

type Props = {
  teams: Team[];
  selectedTeam: string | null;
  onSelect: (team: Team) => void;
};

export function BracketGrid({ teams, selectedTeam, onSelect }: Props) {
  // Tracks which regions are expanded on mobile. Only `<sm` viewports check
  // this — the team list has `sm:block` so desktop ignores it entirely.
  const [expanded, setExpanded] = useState<Set<Region>>(
    () => new Set([REGIONS[0]])
  );
  const toggle = (r: Region) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  };
  const byRegion: Record<Region, Team[]> = {
    East: [],
    West: [],
    South: [],
    Midwest: [],
  };
  for (const t of teams) {
    if (t.region in byRegion) byRegion[t.region as Region].push(t);
  }
  for (const r of REGIONS) {
    byRegion[r].sort((a, b) => a.seed - b.seed || a.team.localeCompare(b.team));
  }

  // hype_normalized scale across the visible set, used to power the inline meter
  const maxNorm = Math.max(...teams.map((t) => t.hype_normalized), 1);

  if (teams.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-12 md:py-16">
      <FadeInSection>
        <header className="mb-6 flex flex-col items-start gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-graphite-soft">
              <span className="font-mono">04</span> / The bracket
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
              By region, by seed — colored by the story they ended up telling
            </h2>
          </div>
        </header>
      </FadeInSection>

      <StaggerGroup
        staggerMs={80}
        className="grid grid-cols-1 gap-px bg-background sm:grid-cols-2 lg:grid-cols-4"
      >
        {REGIONS.map((region) => {
          const isOpen = expanded.has(region);
          const listId = `bracket-region-${region.toLowerCase()}`;
          return (
          <div key={region} className="bg-background">
            <button
              type="button"
              onClick={() => toggle(region)}
              aria-expanded={isOpen}
              aria-controls={listId}
              className="flex w-full items-baseline justify-between border-b border-border px-4 py-3 text-left transition hover:bg-foreground/[0.02] sm:cursor-default sm:hover:bg-transparent"
            >
              <h3 className="flex items-center gap-2 text-xs uppercase tracking-normal text-foreground">
                {region}
                <ChevronDown
                  aria-hidden="true"
                  className={`size-3 text-muted-foreground transition-transform sm:hidden ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </h3>
              <span className="text-xs text-muted-foreground">
                <span className="font-mono tabular-nums">{byRegion[region].length}</span> teams
              </span>
            </button>
            <ul id={listId} className={`${isOpen ? "" : "hidden"} sm:block`}>
              {byRegion[region].map((t) => {
                const style = TAG_STYLE[t.story_tag];
                const isSelected = selectedTeam === t.team;
                const meterPct = (t.hype_normalized / maxNorm) * 100;
                return (
                  <li
                    key={t.team}
                    className={`border-b border-border/40 last:border-b-0 ${
                      isSelected ? "bg-foreground/[0.04]" : ""
                    }`}
                  >
                    <button
                      onClick={() => onSelect(t)}
                      className="group grid w-full grid-cols-[28px_1fr_auto] items-center gap-3 px-4 py-2.5 text-left transition hover:bg-foreground/[0.02]"
                    >
                      <span className="font-mono text-sm tabular-nums text-brand">
                        {String(t.seed).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`size-1.5 rounded-full ${style.dot}`} />
                          <span className="truncate text-sm text-foreground">{t.team}</span>
                        </div>
                        <div className="mt-1.5 h-0.5 w-full bg-border/40">
                          <div
                            style={{ width: `${meterPct}%` }}
                            className={`h-0.5 ${style.bar} transition-all`}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-[0.25em] font-mono tabular-nums leading-tight">
                        <span className={`text-xs ${t.gap < 0 ? "text-rose-600" : t.gap > 0 ? "text-sky-700" : "text-muted-foreground"}`}>
                          {t.gap > 0 ? "+" : ""}
                          {t.gap}
                        </span>
                        <span className="text-[8px] text-muted-foreground">
                          {t.wins}W
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          );
        })}
      </StaggerGroup>
    </section>
  );
}
