"use client";

import {
  AnimatedListReorder,
  AnimatedRow,
  FadeInSection,
} from "@/components/motion";
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
      <div className="mx-auto max-w-7xl px-6 py-24 text-center text-base text-muted-foreground">
        No teams match the current filters.
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-12 md:py-16">
      <FadeInSection>
      <header className="mb-6 flex flex-col items-start gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-graphite-soft">
            <span className="font-mono">01</span> / The diverging gap
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
            Every team, ranked by the wrongness of the internet&apos;s read
          </h2>
        </div>
        <div className="text-xs uppercase tracking-normal text-muted-foreground">
          <span className="font-mono">{sorted.length}</span> teams shown
        </div>
      </header>
      </FadeInSection>

      {/* Desktop axis labels */}
      <div className="mb-2 hidden grid-cols-[1fr_auto_1fr] items-end gap-4 text-xs uppercase tracking-normal text-muted-foreground sm:grid">
        <div className="flex items-center justify-end gap-2 pr-2">
          <span className="size-1.5 rounded-full bg-rose-500" />
          ← Overhyped
        </div>
        <div className="text-center font-mono text-foreground">0</div>
        <div className="flex items-center gap-2 pl-2">
          Underhyped →
          <span className="size-1.5 rounded-full bg-sky-500" />
        </div>
      </div>

      {/* Mobile axis labels — bar position itself communicates the direction */}
      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-normal text-muted-foreground sm:hidden">
        <span className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-rose-500" />
          Overhyped
        </span>
        <span className="flex items-center gap-2">
          Underhyped
          <span className="size-1.5 rounded-full bg-sky-500" />
        </span>
      </div>

      {/* Bar rows. AnimatedListReorder coordinates FLIP transitions when sort/
          filters change; AnimatedRow handles per-row layout + hover lift. */}
      <FadeInSection delay={0.1}>
      <AnimatedListReorder
        id="gap-chart"
        className="divide-y divide-border/40 border-y border-border/40"
      >
        {sorted.map((t) => {
          const isOver = t.gap < 0;
          const widthPct = (Math.abs(t.gap) / maxAbsGap) * 100;
          const style = TAG_STYLE[t.story_tag];
          const isSelected = selectedTeam === t.team;

          return (
            <AnimatedRow
              key={t.team}
              hoverLift={false}
              className={`group cursor-pointer transition-colors ${
                isSelected ? "bg-foreground/[0.04]" : "hover:bg-foreground/[0.02]"
              }`}
            >
              <button
                onClick={() => onSelect(t)}
                className="block w-full text-left"
              >
                {/* MOBILE: single-bar row, anchored left for overhyped, right for underhyped */}
                <div className="relative h-10 w-full sm:hidden">
                  <div
                    style={{ width: `${widthPct}%` }}
                    className={`absolute inset-y-0 ${isOver ? "left-0" : "right-0"} ${style.bar} opacity-25 transition-all`}
                  />
                  <div
                    className={`relative flex h-full items-center gap-3 px-3 ${
                      isOver ? "justify-start" : "justify-end"
                    }`}
                  >
                    {isOver ? (
                      <>
                        <span className="font-mono text-xs tabular-nums text-rose-600">
                          {t.gap}
                        </span>
                        <span className="truncate text-sm text-foreground">
                          {t.team}
                        </span>
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {String(t.seed).padStart(2, "0")}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {String(t.seed).padStart(2, "0")}
                        </span>
                        <span className="truncate text-sm text-foreground">
                          {t.team}
                        </span>
                        <span className="font-mono text-xs tabular-nums text-sky-700">
                          +{t.gap}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* DESKTOP: 3-col butterfly */}
                <div className="hidden grid-cols-[minmax(0,1fr)_2px_minmax(0,1fr)] items-center py-2.5 sm:grid">
                  {/* LEFT half — overhyped lives here */}
                  <div className="flex items-center justify-end gap-3 pr-3">
                    {isOver && (
                      <>
                        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
                          <span className="truncate text-sm text-foreground">
                            {t.team}{" "}
                            <span className="text-muted-foreground">
                              <span className="font-mono text-xs tabular-nums">{String(t.seed).padStart(2, "0")}</span>
                            </span>
                          </span>
                          <span className="font-mono text-xs tabular-nums text-rose-600">
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
                          <span className="font-mono text-xs tabular-nums text-sky-700">
                            +{t.gap}
                          </span>
                          <span className="truncate text-sm text-foreground">
                            {t.team}{" "}
                            <span className="text-muted-foreground">
                              <span className="font-mono text-xs tabular-nums">{String(t.seed).padStart(2, "0")}</span>
                            </span>
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </button>
            </AnimatedRow>
          );
        })}
      </AnimatedListReorder>
      </FadeInSection>

      <FadeInSection delay={0.2}>
        <p className="mt-4 text-xs uppercase tracking-normal text-muted-foreground">
          Click any team to inspect its <span className="font-mono">15</span>-day hype curve →
        </p>
      </FadeInSection>
    </section>
  );
}
