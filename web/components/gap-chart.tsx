"use client";

import { StoryTag, Team } from "@/lib/data";

const TAG_COLOR: Record<StoryTag, string> = {
  overhyped: "#f995b6",
  underhyped: "#66e7d8",
  as_expected: "#efecaf",
  noise: "#b4b4ef",
};

type Props = {
  teams: Team[];
  maxAbsGap: number;
  selectedTeam: string | null;
  onSelect: (team: Team) => void;
  mode: "tournament" | "season";
};

export function GapChart({ teams, maxAbsGap, selectedTeam, onSelect, mode }: Props) {
  const sorted = [...teams].sort((a, b) => a.gap - b.gap);

  if (sorted.length === 0) {
    return (
      <div className="mx-auto max-w-[1440px] px-5 py-24 text-center text-base text-ink-2 sm:px-7">
        No teams match the current filters.
      </div>
    );
  }

  return (
    <section className="relative mx-auto max-w-[1440px] px-5 pt-12 pb-20 sm:px-7 sm:pt-14">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
            <span className="text-core-bright">01</span> /{" "}
            <span className="text-ink-1">The Diverging Gap</span>
          </div>
          <h2
            className="m-0 max-w-[720px] font-display font-bold leading-[1.1] tracking-[-0.01em] text-ink"
            style={{ fontSize: "clamp(22px, 2.6vw, 34px)" }}
          >
            Every team, ranked by the{" "}
            <span
              style={{
                color: "transparent",
                WebkitTextStroke: "1.2px var(--core-bright)",
              }}
            >
              wrongness
            </span>{" "}
            of the internet&apos;s read
          </h2>
          <div className="mt-3.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-2">
            <span className="text-ink">{sorted.length}</span> teams · sorted
            overhyped <span className="mx-1 text-core-bright">→</span> underhyped
            · {mode === "season" ? "season" : "tournament"} window
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 rounded-[10px] border border-border bg-[rgba(255,255,255,0.025)] px-3.5 py-2.5">
          <LegendItem color="var(--overhyped)" label="Overhyped" arrow="←" />
          <LegendItem color="var(--noise)" label="Noise" />
          <LegendItem color="var(--as-expected)" label="As expected" />
          <LegendItem color="var(--underhyped)" label="Underhyped" arrow="→" />
        </div>
      </header>

      {/* Chart frame */}
      <div className="relative overflow-hidden rounded-[14px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.012),rgba(255,255,255,0.003))]">
        {/* Aurora glows */}
        <div
          aria-hidden
          className="aurora"
          style={{
            top: 40,
            left: -100,
            width: 480,
            height: 380,
            background: "radial-gradient(circle, rgba(249,149,182,0.32), transparent 60%)",
          }}
        />
        <div
          aria-hidden
          className="aurora"
          style={{
            bottom: 40,
            right: -120,
            width: 540,
            height: 420,
            background: "radial-gradient(circle, rgba(102,231,216,0.28), transparent 60%)",
          }}
        />

        {/* Axis label row */}
        <div className="relative z-[2] grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-border bg-black/30 px-6 py-3.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-1 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-overhyped">← MORE OVERHYPED</span>
            <span className="mr-2 text-ink-2">−{maxAbsGap}</span>
          </div>
          <div className="rounded-full border border-border-hi bg-[rgba(18,119,222,0.12)] px-3.5 py-1 font-mono text-[10px] tracking-[0.16em] text-core-bright">
            0 · ZERO GAP
          </div>
          <div className="flex items-center justify-between">
            <span className="ml-2 text-ink-2">+{maxAbsGap}</span>
            <span className="text-underhyped">MORE UNDERHYPED →</span>
          </div>
        </div>

        {/* Center axis line */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[50px] bottom-0 z-[2] w-px"
          style={{
            background:
              "linear-gradient(180deg, transparent, var(--border-hi) 10%, var(--border-hi) 90%, transparent)",
          }}
        />

        {/* Rows */}
        <div className="relative z-[1] flex flex-col gap-px px-6 py-2">
          {sorted.map((t, i) => {
            const widthPct = (Math.abs(t.gap) / maxAbsGap) * 100;
            return (
              <DivRow
                key={t.team}
                team={t}
                widthPct={widthPct}
                isOver={t.gap < 0}
                color={TAG_COLOR[t.story_tag]}
                isSel={selectedTeam === t.team}
                rank={i + 1}
                onSelect={onSelect}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-2">
        ↑ Click any row to inspect the 15-day hype curve and matchup notes.
      </div>
    </section>
  );
}

function LegendItem({
  color,
  label,
  arrow,
}: {
  color: string;
  label: string;
  arrow?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {arrow && (
        <span style={{ color }} className="text-[11px]">
          {arrow}
        </span>
      )}
      <span
        className="size-2 rounded-[2px]"
        style={{ background: color }}
      />
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-1">
        {label}
      </span>
    </span>
  );
}

type RowProps = {
  team: Team;
  widthPct: number;
  isOver: boolean;
  color: string;
  isSel: boolean;
  rank: number;
  onSelect: (t: Team) => void;
};

function DivRow({ team, widthPct, isOver, color, isSel, rank, onSelect }: RowProps) {
  const gap = team.gap;
  return (
    <button
      type="button"
      onClick={() => onSelect(team)}
      className={`group relative grid h-[28px] w-full grid-cols-2 items-stretch border-0 bg-transparent p-0 transition-colors ${
        isSel ? "bg-[rgba(114,184,255,0.06)]" : "hover:bg-[rgba(255,255,255,0.025)]"
      }`}
    >
      {/* LEFT half (overhyped) */}
      <div className="relative h-full">
        {isOver && (
          <>
            <div
              className="absolute right-0 top-1 bottom-1 rounded-l-sm transition-all"
              style={{
                width: `${widthPct}%`,
                background: `linear-gradient(90deg, ${color}14, ${color}55 70%, ${color})`,
                boxShadow: isSel
                  ? `0 0 32px ${color}80, inset 0 0 0 1px ${color}cc`
                  : `inset 0 0 0 1px ${color}66`,
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -right-5 -top-2 -bottom-2 blur-md"
              style={{
                width: `${Math.min(widthPct + 20, 100)}%`,
                background: `radial-gradient(ellipse at right, ${color}33, transparent 70%)`,
              }}
            />
            {/* Outer-edge gap badge */}
            <div
              className="absolute left-2 top-1/2 z-[4] inline-flex min-w-12 -translate-y-1/2 items-center justify-center rounded-full border bg-[rgba(10,10,12,0.85)] px-2.5 py-0.5 shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
              style={{ borderColor: `${color}66` }}
            >
              <span
                className="font-mono text-[13px] font-bold tabular-nums tracking-[0.02em]"
                style={{ color, textShadow: "0 0 12px currentColor" }}
              >
                {gap}
              </span>
            </div>
            {/* Inner-edge team labels */}
            <div className="absolute right-3 inset-y-0 z-[3] flex items-center gap-2.5">
              <span className="font-mono text-[10px] tabular-nums text-ink-3">
                ·{String(rank).padStart(2, "0")}
              </span>
              <span className="font-mono text-[10px] font-semibold tabular-nums text-core-bright">
                {String(team.seed).padStart(2, "0")}
              </span>
              <span className="whitespace-nowrap font-sans text-[12.5px] font-medium tracking-[0.01em] text-ink">
                {team.team}
              </span>
            </div>
          </>
        )}
      </div>

      {/* RIGHT half (underhyped) */}
      <div className="relative h-full">
        {!isOver && (
          <>
            <div
              className="absolute left-0 top-1 bottom-1 rounded-r-sm transition-all"
              style={{
                width: `${widthPct}%`,
                background: `linear-gradient(270deg, ${color}14, ${color}55 70%, ${color})`,
                boxShadow: isSel
                  ? `0 0 32px ${color}80, inset 0 0 0 1px ${color}cc`
                  : `inset 0 0 0 1px ${color}66`,
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -left-5 -top-2 -bottom-2 blur-md"
              style={{
                width: `${Math.min(widthPct + 20, 100)}%`,
                background: `radial-gradient(ellipse at left, ${color}33, transparent 70%)`,
              }}
            />
            <div className="absolute left-3 inset-y-0 z-[3] flex items-center gap-2.5">
              <span className="whitespace-nowrap font-sans text-[12.5px] font-medium tracking-[0.01em] text-ink">
                {team.team}
              </span>
              <span className="font-mono text-[10px] font-semibold tabular-nums text-core-bright">
                {String(team.seed).padStart(2, "0")}
              </span>
              <span className="font-mono text-[10px] tabular-nums text-ink-3">
                {String(rank).padStart(2, "0")}·
              </span>
            </div>
            <div
              className="absolute right-2 top-1/2 z-[4] inline-flex min-w-12 -translate-y-1/2 items-center justify-center rounded-full border bg-[rgba(10,10,12,0.85)] px-2.5 py-0.5 shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
              style={{ borderColor: `${color}66` }}
            >
              <span
                className="font-mono text-[13px] font-bold tabular-nums tracking-[0.02em]"
                style={{ color, textShadow: "0 0 12px currentColor" }}
              >
                +{gap}
              </span>
            </div>
          </>
        )}
      </div>
    </button>
  );
}
