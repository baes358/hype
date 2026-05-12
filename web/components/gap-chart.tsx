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
      <header className="mb-6 sm:mb-8">
        <div className="text-sm uppercase tracking-[0.14em] text-graphite-soft">
          <span>01</span> / <span className="font-display tracking-[0.06em]">The diverging gap</span>
        </div>
        <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
          Every team, ranked by the wrongness of the internet&apos;s read
        </h2>
        <div className="mt-3 text-sm uppercase tracking-normal text-muted-foreground">
          <span>{sorted.length}</span> teams shown
        </div>
      </header>
      </FadeInSection>

      {/* Axis labels — bar's anchor side (left vs right) communicates direction. */}
      <div className="mb-2 flex items-center justify-between text-sm uppercase tracking-normal text-muted-foreground">
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
        // Shared divider color across gap / scatter / timeline / bracket so
        // the editorial frame reads consistently.
        className="divide-y divide-[#11495F] border-y border-[#11495F]"
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
                {/* Single-bar row at every viewport. Bar anchors left for
                    overhyped and right for underhyped; labels float on top. */}
                <div className="relative h-10 w-full sm:h-11">
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
                        <span className="font-mono text-xs tabular-nums text-brand">
                          {String(t.seed).padStart(2, "0")}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-mono text-xs tabular-nums text-brand">
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
              </button>
            </AnimatedRow>
          );
        })}
      </AnimatedListReorder>
      </FadeInSection>

      <FadeInSection delay={0.2}>
        <p className="mt-4 text-sm uppercase tracking-normal text-muted-foreground">
          Click any team to inspect its 15-day hype curve →
        </p>
      </FadeInSection>
    </section>
  );
}
