"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";

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

export function TeamSheet({ team, open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-xl border-l border-border bg-background"
      >
        {team && <TeamSheetBody team={team} />}
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

function TeamSheetBody({ team }: { team: Team }) {
  const style = TAG_STYLE[team.story_tag];
  const peak = team.hype_daily.reduce((m, d) => (d.value > m.value ? d : m), team.hype_daily[0]);

  return (
    <div className="flex flex-col gap-6 px-5 py-6 sm:gap-8 sm:px-6 sm:py-8">
      <SheetHeader className="px-0">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-normal text-muted-foreground">
          <span className={`size-1.5 rounded-full ${style.dot}`} />
          {TAG_LABEL[team.story_tag]}
          <span>·</span>
          <span>
            {team.region} · {team.seed} seed
          </span>
        </div>
        <SheetTitle className="mt-3 text-balance text-3xl font-bold leading-[1.05] tracking-tight sm:text-4xl">
          {team.team}
        </SheetTitle>
        <SheetDescription className="text-base text-muted-foreground">
          {team.wins} {team.wins === 1 ? "win" : "wins"} in the 2026 tournament.
        </SheetDescription>
      </SheetHeader>

      {/* Three-up stat strip */}
      <StaggerGroup
        staggerMs={70}
        delay={0.1}
        className="grid grid-cols-3 gap-px bg-border"
      >
        <Stat label="Hype index" value={team.hype_normalized.toFixed(0)} hint="0–100, normalized" />
        <Stat
          label="Hype rank"
          value={`#${team.hype_rank}`}
          hint={`of ${team.hype_rank > team.performance_rank ? "" : ""}68`}
        />
        <Stat
          label="Perf rank"
          value={`#${team.performance_rank}`}
          hint={`${team.wins} wins`}
        />
      </StaggerGroup>

      {/* Gap callout */}
      <div className={`rounded-md border ${style.border} ${style.bg} px-4 py-3`}>
        <div className="font-mono text-xs uppercase tracking-normal text-muted-foreground">
          Gap
        </div>
        <div className="mt-1 flex items-baseline gap-3">
          <span className={`font-mono text-3xl font-bold tabular-nums ${style.text}`}>
            {team.gap > 0 ? "+" : ""}
            {team.gap}
          </span>
          <span className="text-sm text-muted-foreground">
            hype rank − performance rank
          </span>
        </div>
      </div>

      {/* Daily hype chart */}
      <div>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="font-mono text-xs uppercase tracking-normal text-muted-foreground">
              Daily hype, 15-day window
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              Peaked at <span className="font-mono tabular-nums text-foreground">{peak.value.toFixed(0)}</span> on{" "}
              <span className="font-mono tabular-nums text-foreground">{shortDate(peak.date)}</span>
            </div>
          </div>
        </div>

        <ChartContainer config={chartConfig} className="aspect-[16/9] w-full">
          <AreaChart
            data={team.hype_daily}
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
            <YAxis tickLine={false} axisLine={false} width={28} />
            <ChartTooltip
              cursor={{ stroke: "rgba(58,59,59,0.3)", strokeDasharray: "2 4" }}
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => shortDate(label as string)}
                  formatter={(v) => Number(v).toFixed(1)}
                />
              }
            />
            <ReferenceLine y={100} stroke="rgba(58,59,59,0.2)" strokeDasharray="2 2" />
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

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-background px-4 py-3">
      <div className="font-mono text-xs uppercase tracking-normal text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 font-mono text-xs text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}
