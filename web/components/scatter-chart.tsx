"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartConfig,
  ChartContainer,
} from "@/components/ui/chart";
import { FadeInSection, StaggerGroup } from "@/components/motion";
import { ScatterCallouts } from "@/components/scatter-callouts";
import { StoryTag, Team } from "@/lib/data";

// Single-use mobile detector. Initial render is `false` (matches SSR), then
// useEffect flips to `true` on small viewports. Brief layout shift on first
// paint is acceptable here.
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

type Props = {
  teams: Team[];
  selectedTeam: string | null;
  onSelect: (team: Team) => void;
};

// wins → round name (the round the team exited at, or "Champion" for 6 wins).
const ROUND_LABELS: readonly string[] = [
  "First Round",   // 0 wins (lost play-in or R64)
  "Second Round",  // 1 win
  "Sweet 16",      // 2 wins
  "Elite 8",       // 3 wins
  "Final Four",    // 4 wins
  "Runner-up",     // 5 wins
  "Champion",      // 6 wins
];

// Compact labels for mobile y-axis. NCAA bracket conventions (S16, E8, F4)
// are recognizable; R64/R32 carry context from the chart title.
const ROUND_LABELS_MOBILE: readonly string[] = [
  "R64",
  "R32",
  "S16",
  "E8",
  "F4",
  "RU",
  "Champ",
];

// Per-tag dot fill. Mirrors TAG_STYLE in lib/data.ts but as raw hex strings
// because Recharts' shape callback receives the SVG attributes directly,
// not Tailwind classes.
const TAG_COLOR: Record<StoryTag, string> = {
  overhyped: "#f43f5e",   // rose-500
  underhyped: "#0ea5e9",  // sky-500
  as_expected: "#f59e0b", // amber-500
  noise: "#a1a1aa",       // zinc-400
};

const chartConfig: ChartConfig = {
  hype_normalized: { label: "Hype (0–100)" },
  wins: { label: "Wins" },
};

const AXIS_TICK_STYLE = {
  fill: "var(--muted-foreground)",
  fontSize: 12,
  fontFamily: "var(--font-mono)",
} as const;

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: Team }[] }) {
  if (!active || !payload || !payload.length) return null;
  const t = payload[0].payload;
  const round = ROUND_LABELS[t.wins] ?? `${t.wins} wins`;
  return (
    <div className="rounded-md border border-border bg-background/95 px-3 py-2 shadow-sm backdrop-blur-sm">
      <div className="font-semibold text-foreground">{t.team}</div>
      <div className="mt-1 flex flex-col items-start font-mono text-sm uppercase tracking-normal text-muted-foreground">
        <span>{t.seed} seed</span>
        <span>{round}</span>
      </div>
      <div className="mt-1 flex flex-col items-start font-mono text-sm tabular-nums text-muted-foreground">
        <span>Hype #{t.hype_rank}</span>
        <span>gap {t.gap > 0 ? "+" : ""}{t.gap}</span>
      </div>
    </div>
  );
}

export function ScatterChartView({ teams, onSelect }: Props) {
  const isMobile = useIsMobile();
  const yAxisLabels = isMobile ? ROUND_LABELS_MOBILE : ROUND_LABELS;
  const yAxisWidth = isMobile ? 44 : 120;

  if (teams.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-24 text-center text-base text-muted-foreground sm:px-6">
        No teams match the current filters.
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-12 md:py-16">
      <FadeInSection>
        <header className="mb-6 flex flex-col items-start gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div>
            <div className="font-mono text-xs uppercase tracking-normal text-muted-foreground">
              02 / The scatter
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
              Hype against performance, with the diagonal as the expected line
            </h2>
          </div>
          <div className="font-mono text-xs uppercase tracking-normal text-muted-foreground">
            {teams.length} teams shown
          </div>
        </header>
      </FadeInSection>

      <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-10">
        <div className="min-w-0 md:flex-1">
          <FadeInSection delay={0.15}>
          <ChartContainer config={chartConfig} className="aspect-[4/3] w-full">
            <ScatterChart margin={{ top: 16, right: 16, bottom: 32, left: 0 }}>
              <CartesianGrid stroke="rgba(58,59,59,0.08)" />
              <XAxis
                type="number"
                dataKey="hype_normalized"
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickLine={false}
                axisLine={false}
                tick={AXIS_TICK_STYLE}
                label={{
                  value: "Hype index (0–100)",
                  position: "bottom",
                  offset: 8,
                  style: { fill: "var(--muted-foreground)", fontSize: 12, fontFamily: "var(--font-mono)", textTransform: "uppercase" },
                }}
              />
              <YAxis
                type="number"
                dataKey="wins"
                domain={[0, 6]}
                ticks={[0, 1, 2, 3, 4, 5, 6]}
                tickLine={false}
                axisLine={false}
                tick={AXIS_TICK_STYLE}
                tickFormatter={(v: number) => yAxisLabels[v] ?? String(v)}
                width={yAxisWidth}
              />
              <ReferenceLine
                segment={[
                  { x: 0, y: 0 },
                  { x: 100, y: 6 },
                ]}
                stroke="rgba(58,59,59,0.3)"
                strokeDasharray="3 4"
                ifOverflow="visible"
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(58,59,59,0.2)", strokeDasharray: "2 4" }} />
              <Scatter
                data={teams}
                isAnimationActive={false}
                shape={(props: { cx?: number; cy?: number; payload?: Team }) => {
                  const { cx, cy, payload } = props;
                  if (cx == null || cy == null || !payload) return <g />;
                  const fill = TAG_COLOR[payload.story_tag];
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={fill}
                      fillOpacity={0.85}
                      stroke="white"
                      strokeWidth={1}
                      style={{ cursor: "pointer" }}
                    />
                  );
                }}
                onClick={(point: { payload?: Team }) => {
                  if (point.payload) onSelect(point.payload);
                }}
              />
            </ScatterChart>
          </ChartContainer>
          </FadeInSection>

          <StaggerGroup
            staggerMs={50}
            delay={0.25}
            className="mt-4 flex flex-col items-start gap-y-1 font-mono text-xs uppercase tracking-normal text-muted-foreground"
          >
            <span>Below the line ↘ overhyped</span>
            <span>Above the line ↗ underhyped</span>
            <span>Click any dot for details</span>
          </StaggerGroup>
        </div>

        <ScatterCallouts teams={teams} onSelect={onSelect} />
      </div>
    </section>
  );
}
