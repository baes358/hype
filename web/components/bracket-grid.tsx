"use client";

import { Region, REGIONS, Team, TAG_STYLE } from "@/lib/data";

type Props = {
  teams: Team[];
  selectedTeam: string | null;
  onSelect: (team: Team) => void;
};

export function BracketGrid({ teams, selectedTeam, onSelect }: Props) {
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
    <section className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
      <header className="mb-8 flex items-end justify-between gap-6">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            02 / The bracket
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            By region, by seed — colored by the story they ended up telling
          </h2>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-px bg-border/60 sm:grid-cols-2 lg:grid-cols-4">
        {REGIONS.map((region) => (
          <div key={region} className="bg-background">
            <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground">
                {region}
              </h3>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                {byRegion[region].length} teams
              </span>
            </div>
            <ul>
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
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                        {String(t.seed).padStart(2, " ")}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`size-1.5 rounded-full ${style.dot}`} />
                          <span className="truncate text-sm text-foreground">{t.team}</span>
                        </div>
                        <div className="mt-1.5 h-px w-full bg-border/40">
                          <div
                            style={{ width: `${meterPct}%` }}
                            className={`h-px ${style.bar} transition-all`}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col items-end font-mono text-[10px] tabular-nums leading-tight">
                        <span className="text-muted-foreground">
                          {t.wins}W
                        </span>
                        <span className={t.gap < 0 ? "text-rose-400" : t.gap > 0 ? "text-sky-300" : "text-muted-foreground"}>
                          {t.gap > 0 ? "+" : ""}
                          {t.gap}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
