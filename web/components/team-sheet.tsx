"use client";

import { useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StoryTag, TAG_LABEL, Team } from "@/lib/data";

const TAG_COLOR: Record<StoryTag, string> = {
  overhyped: "#f995b6",
  underhyped: "#66e7d8",
  as_expected: "#efecaf",
  noise: "#b4b4ef",
};

type Props = {
  team: Team | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hypeWindowStart: string;
  hypeWindowEnd: string;
};

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
}

function formatAcceleration(v: number): string {
  if (!Number.isFinite(v) || v < 0) return "—";
  return v < 100 ? `${v.toFixed(1)}×` : `${Math.round(v)}×`;
}

export function TeamSheet({
  team,
  open,
  onOpenChange,
  hypeWindowStart,
  hypeWindowEnd,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto bg-bg-1 sm:max-w-2xl"
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
  const color = TAG_COLOR[team.story_tag];
  const seasonDaily =
    team.season_hype_daily.length > 0 ? team.season_hype_daily : team.hype_daily;
  const peak = seasonDaily.reduce(
    (m, d) => (d.value > m.value ? d : m),
    seasonDaily[0]
  );
  const gap = team.gap;

  return (
    <div
      className="relative isolate flex flex-col gap-5"
      style={{ padding: "clamp(1.25rem, 4vw, 1.75rem)" }}
    >
      {/* Aurora glow behind */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[400px] opacity-40 blur-[60px]"
        style={{
          background: `radial-gradient(circle, ${color}33, transparent 60%)`,
        }}
      />

      <SheetHeader className="gap-0 p-0">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-2">
          TEAM DOSSIER · ID #{String(team.hype_rank).padStart(3, "0")}
        </div>
        <div className="mb-4 flex items-center gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-bold tabular-nums tracking-[0.06em] text-core-bright">
                #{String(team.seed).padStart(2, "0")}
              </span>
              <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-1">
                {team.region.toUpperCase()} REGION
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]"
                style={{
                  color,
                  borderColor: `${color}55`,
                  background: `${color}11`,
                }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: color }}
                />
                {TAG_LABEL[team.story_tag]}
              </span>
            </div>
            <SheetTitle
              className="m-0 break-words font-display font-bold leading-tight tracking-[-0.01em] text-ink"
              style={{ fontSize: "clamp(20px, 4.5vw, 28px)" }}
            >
              {team.team}
            </SheetTitle>
          </div>
        </div>
        <SheetDescription className="sr-only">
          {team.wins} {team.wins === 1 ? "win" : "wins"} in the {team.region} region.
        </SheetDescription>
      </SheetHeader>

      {/* Big gap callout */}
      <div className="rounded-2xl border border-border bg-[rgba(255,255,255,0.025)] px-5 py-5">
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
          Tournament Gap
        </div>
        <div
          className="font-display font-bold leading-none tracking-[-0.02em] tabular-nums"
          style={{
            color,
            textShadow: "0 0 24px currentColor",
            fontSize: "clamp(40px, 9vw, 56px)",
          }}
        >
          {gap > 0 ? `+${gap}` : gap}
        </div>
        <div className="mt-3 max-w-[420px] font-sans text-[13.5px] leading-[1.5] text-ink-1">
          {gap > 0
            ? `Hyped at rank #${team.hype_rank} but went ${team.wins}W — the internet underrated them by ${Math.abs(gap)} spots.`
            : gap < 0
            ? `Hyped at rank #${team.hype_rank} but went ${team.wins}W — the internet overrated them by ${Math.abs(gap)} spots.`
            : `Hyped at rank #${team.hype_rank}, performed in line. Exactly as expected.`}
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
        <SheetStat label="Wins" value={String(team.wins)} />
        <SheetStat label="Hype rank" value={`#${team.hype_rank}`} />
        <SheetStat label="Hype index" value={team.hype_normalized.toFixed(1)} />
        <SheetStat
          label="Season gap"
          value={team.season_gap > 0 ? `+${team.season_gap}` : `${team.season_gap}`}
        />
        <SheetStat
          label="Hype accel"
          value={formatAcceleration(team.hype_acceleration)}
        />
        <SheetStat label="Perf rank" value={`#${team.performance_rank}`} />
        <SheetStat
          label="Season W-L"
          value={`${team.season_wins}-${team.season_losses}`}
        />
        <SheetStat
          label="Perf accel"
          value={formatAcceleration(team.performance_acceleration)}
        />
      </div>

      {/* Full season curve */}
      <ChartBlock
        data={seasonDaily}
        color={color}
        peak={peak}
        windowStart={hypeWindowStart}
        windowEnd={hypeWindowEnd}
        team={team}
      />
    </div>
  );
}

function ChartBlock({
  data,
  color,
  peak,
  windowStart,
  windowEnd,
  team,
}: {
  data: { date: string; value: number }[];
  color: string;
  peak: { date: string; value: number };
  windowStart: string;
  windowEnd: string;
  team: Team;
}) {
  const [view, setView] = useState<"area" | "line">("area");
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-1">
          FULL SEASON HYPE CURVE
        </span>
        <div className="inline-flex shrink-0 rounded-md border border-border bg-[rgba(255,255,255,0.025)] p-0.5">
          {(["area", "line"] as const).map((v) => {
            const active = view === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={active}
                className={`min-h-7 rounded-[5px] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-all ${
                  active
                    ? "bg-[rgba(255,255,255,0.06)] text-ink shadow-[inset_0_0_0_1px_var(--border-hi)]"
                    : "text-ink-2 hover:text-ink"
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>
      <Curve
        data={data}
        color={color}
        windowStart={windowStart}
        windowEnd={windowEnd}
        team={team}
        view={view}
      />
      <div className="font-mono text-[10px] tracking-[0.1em] text-ink-3">
        peaked {peak.value.toFixed(0)} on {shortDate(peak.date)}
      </div>
    </div>
  );
}

function SheetStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-1 px-3.5 py-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-2">
        {label}
      </div>
      <div className="mt-1.5 font-display text-[18px] font-bold text-ink sm:text-[20px]">
        {value}
      </div>
    </div>
  );
}

function Curve({
  data,
  color,
  windowStart,
  windowEnd,
  team,
  view,
}: {
  data: { date: string; value: number }[];
  color: string;
  windowStart: string;
  windowEnd: string;
  team: Team;
  view: "area" | "line";
}) {
  if (data.length === 0) return null;
  const W = 600;
  const H = 240;
  const PAD_L = 0;
  const PAD_R = 0;
  const PAD_T = 24;
  const PAD_B = 8;

  const max = Math.max(1, ...data.map((d) => d.value));
  const x = (i: number) =>
    PAD_L + (i / (data.length - 1)) * (W - PAD_L - PAD_R);
  const y = (v: number) => H - PAD_B - (v / max) * (H - PAD_T - PAD_B);

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.value)}`)
    .join(" ");
  const fillPath = `${linePath} L ${W} ${H} L 0 ${H} Z`;

  // Highlight the tournament window with a vertical band.
  const wStartIdx = data.findIndex((d) => d.date >= windowStart);
  const wEndIdx = data.findIndex((d) => d.date >= windowEnd);
  const startX = wStartIdx >= 0 ? x(wStartIdx) : null;
  const endX = wEndIdx >= 0 ? x(wEndIdx) : x(data.length - 1);

  const gradId = `curve-fill-${team.team.replace(/\W/g, "")}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block w-full rounded-lg border border-border bg-[rgba(255,255,255,0.02)]"
      style={{ height: H }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.45" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((p) => (
        <line
          key={p}
          x1={0}
          y1={PAD_T + p * (H - PAD_T - PAD_B)}
          x2={W}
          y2={PAD_T + p * (H - PAD_T - PAD_B)}
          stroke="rgba(255,255,255,0.05)"
          strokeDasharray="2 4"
        />
      ))}
      {/* Window band */}
      {startX !== null && (
        <>
          <rect
            x={startX}
            y={PAD_T}
            width={endX - startX}
            height={H - PAD_T - PAD_B}
            fill="rgba(114,184,255,0.06)"
            stroke="rgba(114,184,255,0.25)"
            strokeDasharray="3 3"
          />
          <text
            x={(startX + endX) / 2}
            y={14}
            fill="var(--core-bright)"
            fontFamily="var(--font-mono)"
            fontSize="9"
            letterSpacing="0.12em"
            textAnchor="middle"
          >
            TOURNAMENT WINDOW
          </text>
        </>
      )}
      {view === "area" && <path d={fillPath} fill={`url(#${gradId})`} />}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={view === "line" ? "2.2" : "1.8"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
