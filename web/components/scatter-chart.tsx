"use client";

import { useMemo } from "react";

import { StoryTag, Team } from "@/lib/data";

const TAG_COLOR: Record<StoryTag, string> = {
  overhyped: "#f995b6",
  underhyped: "#66e7d8",
  as_expected: "#efecaf",
  noise: "#b4b4ef",
};

const ROUND_LABELS = [
  "First Round",
  "Second",
  "Sweet 16",
  "Elite 8",
  "Final Four",
  "Runner-up",
  "Champion",
] as const;

type Props = {
  teams: Team[];
  selectedTeam: string | null;
  onSelect: (team: Team) => void;
};

export function ScatterChartView({ teams, selectedTeam, onSelect }: Props) {
  const calls = useMemo(() => {
    const above = [...teams].filter((t) => t.gap > 0).sort((a, b) => b.gap - a.gap).slice(0, 3);
    const below = [...teams].filter((t) => t.gap < 0).sort((a, b) => a.gap - b.gap).slice(0, 3);
    return { above, below };
  }, [teams]);

  if (teams.length === 0) {
    return (
      <div className="mx-auto max-w-[1440px] px-5 py-24 text-center text-base text-ink-2 sm:px-7">
        No teams match the current filters.
      </div>
    );
  }

  const W = 1100;
  const H = 600;
  const PAD_L = 110;
  const PAD_R = 60;
  const PAD_T = 40;
  const PAD_B = 60;
  const PW = W - PAD_L - PAD_R;
  const PH = H - PAD_T - PAD_B;

  const xFor = (hype: number) =>
    PAD_L + (Math.min(100, hype) / 100) * PW;
  const yFor = (wins: number) => PAD_T + PH - (wins / 6) * PH;

  return (
    <section className="relative mx-auto max-w-[1440px] px-5 pt-12 pb-20 sm:px-7 sm:pt-14">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
            <span className="text-core-bright">02</span> /{" "}
            <span className="text-ink-1">The Scatter</span>
          </div>
          <h2
            className="m-0 max-w-[720px] font-display font-bold leading-[1.1] tracking-[-0.01em] text-ink"
            style={{ fontSize: "clamp(22px, 2.6vw, 34px)" }}
          >
            Hype against performance — the{" "}
            <span
              style={{
                color: "transparent",
                WebkitTextStroke: "1.2px var(--core-bright)",
              }}
            >
              diagonal
            </span>{" "}
            is the expected line
          </h2>
          <div className="mt-3.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-2">
            <span className="text-ink">{teams.length}</span> teams · outliers are
            the story · X = hype index 0–100 · Y = tournament wins
          </div>
        </div>

        <div className="flex flex-wrap gap-3.5">
          <CalloutGroup label="Most underhyped" tag="underhyped" teams={calls.above} arrow="↑" />
          <CalloutGroup label="Most overhyped" tag="overhyped" teams={calls.below} arrow="↓" />
        </div>
      </header>

      <div className="relative aspect-[11/6] overflow-hidden rounded-[14px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.012),rgba(255,255,255,0.003))]">
        <div
          aria-hidden
          className="aurora"
          style={{
            top: -120,
            left: -120,
            width: 500,
            height: 500,
            background: "radial-gradient(circle, rgba(102,231,216,0.22), transparent 60%)",
          }}
        />
        <div
          aria-hidden
          className="aurora"
          style={{
            bottom: -100,
            right: -100,
            width: 500,
            height: 500,
            background: "radial-gradient(circle, rgba(249,149,182,0.22), transparent 60%)",
          }}
        />

        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="relative z-[1] block size-full"
        >
          <defs>
            <linearGradient id="scatter-diag" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#f995b6" stopOpacity="0.5" />
              <stop offset="0.5" stopColor="#72b8ff" stopOpacity="0.8" />
              <stop offset="1" stopColor="#66e7d8" stopOpacity="0.5" />
            </linearGradient>
          </defs>

          <rect
            x={PAD_L}
            y={PAD_T}
            width={PW}
            height={PH}
            fill="rgba(255,255,255,0.01)"
          />

          {/* Grid */}
          {[0, 1, 2, 3, 4, 5, 6].map((w) => (
            <line
              key={`y-${w}`}
              x1={PAD_L}
              y1={yFor(w)}
              x2={W - PAD_R}
              y2={yFor(w)}
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="2 4"
            />
          ))}
          {[0, 25, 50, 75, 100].map((h) => (
            <line
              key={`x-${h}`}
              x1={xFor(h)}
              y1={PAD_T}
              x2={xFor(h)}
              y2={H - PAD_B}
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="2 4"
            />
          ))}

          {/* Expected diagonal */}
          <line
            x1={xFor(0)}
            y1={yFor(0)}
            x2={xFor(100)}
            y2={yFor(6)}
            stroke="url(#scatter-diag)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />

          {/* Zone labels */}
          <text
            x={xFor(15)}
            y={yFor(5.5)}
            fill="rgba(102,231,216,0.65)"
            fontFamily="var(--font-mono)"
            fontSize="11"
            letterSpacing="0.14em"
          >
            ↑ UNDERHYPED · ROBBED
          </text>
          <text
            x={xFor(60)}
            y={yFor(0.5)}
            fill="rgba(249,149,182,0.65)"
            fontFamily="var(--font-mono)"
            fontSize="11"
            letterSpacing="0.14em"
          >
            ↓ OVERHYPED · FLAMEOUT
          </text>

          {/* Dots */}
          {teams.map((t) => {
            const x = xFor(t.hype_normalized);
            const y = yFor(t.wins);
            const color = TAG_COLOR[t.story_tag];
            const isSel = selectedTeam === t.team;
            const r = isSel ? 9 : Math.abs(t.gap) > 25 ? 7 : 5;
            return (
              <g
                key={t.team}
                style={{ cursor: "pointer" }}
                onClick={() => onSelect(t)}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={r + 8}
                  fill={color}
                  opacity="0.25"
                  style={{ filter: "blur(4px)" }}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={color}
                  fillOpacity={isSel ? 1 : 0.92}
                  stroke="rgba(10,10,12,0.9)"
                  strokeWidth="1.5"
                />
                {isSel && (
                  <circle
                    cx={x}
                    cy={y}
                    r={r + 4}
                    fill="none"
                    stroke="#72b8ff"
                    strokeWidth="1.5"
                  />
                )}
              </g>
            );
          })}

          {/* X axis ticks */}
          {[0, 25, 50, 75, 100].map((h) => (
            <text
              key={`xt-${h}`}
              x={xFor(h)}
              y={H - PAD_B + 18}
              fill="rgba(251,253,254,0.5)"
              fontFamily="var(--font-mono)"
              fontSize="10"
              textAnchor="middle"
            >
              {h}
            </text>
          ))}
          <text
            x={PAD_L + PW / 2}
            y={H - 14}
            fill="rgba(251,253,254,0.65)"
            fontFamily="var(--font-mono)"
            fontSize="11"
            letterSpacing="0.14em"
            textAnchor="middle"
          >
            HYPE INDEX (0–100)
          </text>

          {/* Y axis ticks */}
          {[0, 1, 2, 3, 4, 5, 6].map((w) => (
            <text
              key={`yt-${w}`}
              x={PAD_L - 12}
              y={yFor(w) + 4}
              fill="rgba(251,253,254,0.65)"
              fontFamily="var(--font-mono)"
              fontSize="10"
              textAnchor="end"
            >
              {ROUND_LABELS[w]}
            </text>
          ))}
        </svg>
      </div>
    </section>
  );
}

function CalloutGroup({
  label,
  tag,
  teams,
  arrow,
}: {
  label: string;
  tag: StoryTag;
  teams: Team[];
  arrow: string;
}) {
  const color = TAG_COLOR[tag];
  return (
    <div className="min-w-[200px] rounded-[10px] border border-border bg-[rgba(255,255,255,0.025)] px-4 py-3">
      <div
        className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em]"
        style={{ color }}
      >
        {arrow} {label}
      </div>
      <div className="flex flex-col gap-1">
        {teams.map((t) => (
          <div
            key={t.team}
            className="grid grid-cols-[40px_1fr_auto] items-center gap-2"
          >
            <span
              className="font-mono text-[12px] font-bold tabular-nums"
              style={{ color }}
            >
              {t.gap > 0 ? `+${t.gap}` : t.gap}
            </span>
            <span className="font-sans text-[12px] text-ink">{t.team}</span>
            <span className="font-mono text-[10px] tabular-nums text-core-bright">
              {String(t.seed).padStart(2, "0")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
