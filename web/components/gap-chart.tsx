"use client";

import { Team, TAG_STYLE } from "@/lib/data";

type Props = {
  teams: Team[];
  maxAbsGap: number;
  selectedTeam: string | null;
  onSelect: (team: Team) => void;
};

export function GapChart({ teams, maxAbsGap, selectedTeam, onSelect }: Props) {
  // Sort: most overhyped (largest negative gap) at top → underhyped at bottom
  const sorted = [...teams].sort((a, b) => a.gap - b.gap);

  if (sorted.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center text-sm text-muted-foreground">
        No teams match the current filters.
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-12 md:py-16">
      <header className="mb-6 flex flex-col items-start gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-normal text-muted-foreground">
            01 / The diverging gap
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
            Every team, ranked by the wrongness of the internet&apos;s read
          </h2>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-normal text-muted-foreground">
          {sorted.length} teams shown
        </div>
      </header>

      {/* Axis labels */}
      <div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-end gap-4 font-mono text-[9px] uppercase tracking-normal text-muted-foreground">
        <div className="flex items-center justify-end gap-2 pr-2">
          <span className="size-1.5 rounded-full bg-rose-500" />
          ← Overhyped
        </div>
        <div className="text-center text-foreground">0</div>
        <div className="flex items-center gap-2 pl-2">
          Underhyped →
          <span className="size-1.5 rounded-full bg-sky-500" />
        </div>
      </div>

      {/* Bar rows */}
      <ul className="divide-y divide-border/40 border-y border-border/40">
        {sorted.map((t) => {
          const isOver = t.gap < 0;
          const widthPct = (Math.abs(t.gap) / maxAbsGap) * 100;
          const style = TAG_STYLE[t.story_tag];
          const isSelected = selectedTeam === t.team;

          return (
            <li
              key={t.team}
              className={`group cursor-pointer transition ${
                isSelected ? "bg-foreground/[0.04]" : "hover:bg-foreground/[0.02]"
              }`}
            >
              <button
                onClick={() => onSelect(t)}
                className="grid w-full grid-cols-[minmax(0,1fr)_2px_minmax(0,1fr)] items-center py-2.5 text-left"
              >
                {/* LEFT half — overhyped lives here */}
                <div className="flex items-center justify-end gap-3 pr-3">
                  {isOver && (
                    <>
                      <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
                        <span className="truncate text-sm text-foreground">
                          {t.team}{" "}
                          <span className="text-muted-foreground">
                            <span className="font-mono text-[10px] tabular-nums">{String(t.seed).padStart(2, "0")}</span>
                          </span>
                        </span>
                        <span className="font-mono text-[10px] tabular-nums text-rose-600">
                          {t.gap}
                        </span>
                      </div>
                      <div
                        style={{ width: `${widthPct}%` }}
                        className={`h-2 ${style.bar} transition-all group-hover:opacity-90`}
                      />
                    </>
                  )}
                </div>

                {/* CENTER axis */}
                <div
                  className={`h-6 w-px ${
                    isSelected ? "bg-foreground" : "bg-border"
                  }`}
                />

                {/* RIGHT half — underhyped lives here */}
                <div className="flex items-center gap-3 pl-3">
                  {!isOver && (
                    <>
                      <div
                        style={{ width: `${widthPct}%` }}
                        className={`h-2 ${style.bar} transition-all group-hover:opacity-90`}
                      />
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="font-mono text-[10px] tabular-nums text-sky-700">
                          +{t.gap}
                        </span>
                        <span className="truncate text-sm text-foreground">
                          {t.team}{" "}
                          <span className="text-muted-foreground">
                            <span className="font-mono text-[10px] tabular-nums">{String(t.seed).padStart(2, "0")}</span>
                          </span>
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 font-mono text-[9px] uppercase tracking-normal text-muted-foreground">
        Click any team to inspect its 15-day hype curve →
      </p>
    </section>
  );
}
