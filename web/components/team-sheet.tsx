"use client";

import { Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceLine, XAxis, YAxis } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StaggerGroup } from "@/components/motion";
import { Team, TAG_LABEL, TAG_STYLE } from "@/lib/data";

type Props = {
  team: Team | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hypeWindowStart: string;
  hypeWindowEnd: string;
};

const chartConfig: ChartConfig = {
  value: {
    label: "Hype",
    color: "#44d1d1", // rose-500
  },
};

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
}

function formatAcceleration(v: number): string {
  if (!Number.isFinite(v) || v < 0) return "—";
  return v < 100 ? `${v.toFixed(1)}×` : `${Math.round(v)}×`;
}

export function TeamSheet({ team, open, onOpenChange, hypeWindowStart, hypeWindowEnd }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-xl border-l border-border bg-background"
      >
        {team && (
          <TeamSheetBody
            team={team}
            hypeWindowStart={hypeWindowStart}
            hypeWindowEnd={hypeWindowEnd}
          />
        )}
        {!team && (
          <SheetHeader>
            <SheetTitle>Loading…</SheetTitle>
            <SheetDescription>Pick a team to see details.</SheetDescription>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  );
}

function TeamSheetBody({
  team,
  hypeWindowStart,
  hypeWindowEnd,
}: {
  team: Team;
  hypeWindowStart: string;
  hypeWindowEnd: string;
}) {
  const style = TAG_STYLE[team.story_tag];
  const seasonDaily = team.season_hype_daily.length > 0 ? team.season_hype_daily : team.hype_daily;
  const peak = seasonDaily.reduce((m, d) => (d.value > m.value ? d : m), seasonDaily[0]);

  return (
    <div className="flex flex-col gap-6 px-5 py-6 sm:gap-8 sm:px-6 sm:py-8">
      <SheetHeader className="px-0">
        <div className="flex flex-col items-start gap-1 text-sm uppercase tracking-normal text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className={`size-1.5 rounded-full ${style.dot}`} />
            {TAG_LABEL[team.story_tag]}
          </span>
          <span>{team.region}</span>
          <span><span className="font-mono">{team.seed}</span> seed</span>
        </div>
        <SheetTitle className="mt-3 text-balance text-3xl font-bold leading-[1.05] tracking-tight sm:text-4xl">
          {team.team}
        </SheetTitle>
        <SheetDescription className="text-base text-muted-foreground">
          {team.wins} {team.wins === 1 ? "win" : "wins"} in the 2026 tournament.
        </SheetDescription>
      </SheetHeader>

      {/* Stat strip — 6 stats, 2x3 on mobile / 3x2 on desktop */}
      <StaggerGroup
        staggerMs={70}
        delay={0.1}
        className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3"
      >
        <Stat label="Hype index" value={team.hype_normalized.toFixed(0)} hint="0–100, normalized" />
        <Stat label="Hype rank" value={`#${team.hype_rank}`} hint="of 68" />
        <Stat
          label="Hype accel"
          value={formatAcceleration(team.hype_acceleration)}
          hint="tournament vs. season"
        />
        <Stat
          label="Perf rank"
          value={`#${team.performance_rank}`}
          hint={`${team.wins} tournament ${team.wins === 1 ? "win" : "wins"}`}
        />
        <Stat
          label="Season record"
          value={`${team.season_wins}-${team.season_losses}`}
          hint="full season"
        />
        <Stat
          label="Perf accel"
          value={formatAcceleration(team.performance_acceleration)}
          hint="tournament vs. season"
        />
      </StaggerGroup>

      {/* Dual gap callouts — tournament + season side-by-side */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <GapCallout
          label="Tournament gap"
          gap={team.gap}
          tag={team.story_tag}
          subtitle="hype rank − tournament wins rank"
        />
        <GapCallout
          label="Season gap"
          gap={team.season_gap}
          tag={team.season_story_tag}
          subtitle="season hype rank − season win % rank"
        />
      </div>

      {/* Daily hype chart */}
      <div>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="text-sm uppercase tracking-normal text-muted-foreground">
              Daily hype, full season
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              Peaked at <span className="font-mono tabular-nums text-foreground">{peak.value.toFixed(0)}</span> on{" "}
              <span className="font-mono tabular-nums text-foreground">{shortDate(peak.date)}</span>
            </div>
          </div>
        </div>

        <ChartContainer config={chartConfig} className="aspect-[16/9] w-full">
          <AreaChart
            data={seasonDaily}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="hype-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#44d1d1" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#44d1d1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(58,59,59,0.08)" />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis tickLine={false} axisLine={false} width={40} interval={0} />
            <ChartTooltip
              cursor={{ stroke: "rgba(58,59,59,0.3)", strokeDasharray: "2 4" }}
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => shortDate(label as string)}
                  formatter={(v) => Number(v).toFixed(1)}
                />
              }
            />
            <ReferenceArea
              x1={hypeWindowStart}
              x2={hypeWindowEnd}
              fill="#44d1d1"
              fillOpacity={0.1}
              stroke="none"
            />
            <ReferenceLine
              y={team.season_hype_raw}
              stroke="rgba(58,59,59,0.25)"
              strokeDasharray="2 2"
              label={{
                value: "season avg",
                position: "right",
                fill: "rgba(58,59,59,0.6)",
                fontSize: 10,
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#44d1d1"
              strokeWidth={1.5}
              fill="url(#hype-area)"
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </div>
  );
}

function GapCallout({
  label,
  gap,
  tag,
  subtitle,
}: {
  label: string;
  gap: number;
  tag: Team["story_tag"];
  subtitle: string;
}) {
  const s = TAG_STYLE[tag];
  return (
    <div className={`rounded-md border ${s.border} ${s.bg} px-4 py-3`}>
      <div className="flex items-center gap-2 text-sm uppercase tracking-normal text-muted-foreground">
        <span className={`size-1.5 rounded-full ${s.dot}`} />
        {label}
      </div>
      <div className="mt-1 flex flex-col items-start gap-0.5">
        <span className={`font-mono text-3xl font-bold tabular-nums leading-none ${s.text}`}>
          {gap > 0 ? "+" : ""}
          {gap}
        </span>
        <span className="text-sm text-muted-foreground">{subtitle}</span>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="h-full bg-background px-4 py-3">
      <div className="text-sm uppercase tracking-normal text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 text-sm uppercase tracking-normal text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}
