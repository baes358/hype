"use client";

import { useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/icon";
import { StoryTag, Team, dataset } from "@/lib/data";

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

const SHORT_ROUND_LABELS = [
  "R64",
  "R32",
  "S16",
  "E8",
  "F4",
  "F2",
  "CH",
] as const;

type Props = {
  teams: Team[];
  selectedTeam: string | null;
  onSelect: (team: Team) => void;
};

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const u = () => setM(mq.matches);
    u();
    mq.addEventListener("change", u);
    return () => mq.removeEventListener("change", u);
  }, []);
  return m;
}

function formatRangeLabel(start: string, end: string): string {
  const fmt = (iso: string) => {
    const [, m, d] = iso.split("-").map(Number);
    const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];
    return `${month} ${d}`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

export function ScatterChartView({ teams, selectedTeam, onSelect }: Props) {
  const isMobile = useIsMobile();
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

  const W = isMobile ? 480 : 1200;
  const H = isMobile ? 520 : 760;
  const PAD_L = isMobile ? 92 : 150;
  const PAD_R = isMobile ? 24 : 80;
  const PAD_T = isMobile ? 32 : 56;
  const PAD_B = isMobile ? 72 : 88;
  const PW = W - PAD_L - PAD_R;
  const PH = H - PAD_T - PAD_B;
  const labelSize = isMobile ? 12 : 14;
  const tickSize = isMobile ? 11 : 13;
  const zoneSize = isMobile ? 11 : 14;

  const xFor = (hype: number) =>
    PAD_L + (Math.min(100, hype) / 100) * PW;
  const yFor = (wins: number) => PAD_T + PH - (wins / 6) * PH;

  const tournamentYear = dataset.metadata.tournament_year;
  const windowLabel = formatRangeLabel(
    dataset.metadata.hype_window_start,
    dataset.metadata.hype_window_end
  );

  return (
    <section
      className="relative mx-auto max-w-[1440px]"
      style={{
        padding:
          "clamp(2.5rem, 6vw, 4.5rem) clamp(1.25rem, 4vw, 2rem) clamp(3rem, 7vw, 5rem)",
      }}
    >
      <header className="mb-8 flex flex-col gap-5 md:mb-10 md:gap-7">
        <div>
          <div className="mb-3 font-mono text-sm uppercase tracking-[0.14em] text-ink-2">
            <span className="text-core-bright">02</span> /{" "}
            <span className="text-ink-1">The Scatter</span>
          </div>
          <h2
            className="m-0 max-w-[820px] font-display font-bold leading-[1.25] tracking-[-0.005em] text-ink"
            style={{ fontSize: "clamp(24px, 3vw, 38px)" }}
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
          <div className="mt-4 font-mono text-sm uppercase tracking-[0.1em] text-ink-1">
            <span className="text-ink">{teams.length}</span> teams · outliers
            are the story · X = hype · Y = wins
          </div>
        </div>

        {/* Prominent tournament-window banner */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-core-bright/30 bg-[rgba(18,119,222,0.10)] px-4 py-3 sm:px-5">
          <Icon name="bullet" size={11} />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-core-bright sm:text-xs">
            Tournament
          </span>
          <span className="font-display text-base font-bold uppercase tracking-[0.06em] text-ink sm:text-lg">
            NCAA · March Madness · {tournamentYear}
          </span>
          <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2 sm:text-xs">
            {windowLabel} · 15-day hype window
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <CalloutGroup label="Most underhyped" tag="underhyped" teams={calls.above} arrow="↑" />
          <CalloutGroup label="Most overhyped" tag="overhyped" teams={calls.below} arrow="↓" />
        </div>
      </header>

      <div
        className="relative overflow-hidden rounded-[14px] border border-border bg-bg-1"
        style={{ aspectRatio: isMobile ? "12 / 13" : "12 / 7.5" }}
      >

        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
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
            x={xFor(isMobile ? 5 : 12)}
            y={yFor(5.5)}
            fill="rgba(102,231,216,0.75)"
            fontFamily="var(--font-mono)"
            fontSize={zoneSize}
            letterSpacing="0.14em"
          >
            ↑ UNDERHYPED · ROBBED
          </text>
          <text
            x={xFor(isMobile ? 50 : 58)}
            y={yFor(0.5)}
            fill="rgba(249,149,182,0.75)"
            fontFamily="var(--font-mono)"
            fontSize={zoneSize}
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
            const baseR = isMobile ? 6 : 7;
            const bigR = isMobile ? 8 : 10;
            const r = isSel ? bigR + 2 : Math.abs(t.gap) > 25 ? bigR : baseR;
            return (
              <g
                key={t.team}
                style={{ cursor: "pointer" }}
                onClick={() => onSelect(t)}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={r + 10}
                  fill={color}
                  opacity="0.25"
                  style={{ filter: "blur(5px)" }}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={color}
                  fillOpacity={isSel ? 1 : 0.95}
                  stroke="rgba(10,10,12,0.9)"
                  strokeWidth="1.6"
                />
                {isSel && (
                  <circle
                    cx={x}
                    cy={y}
                    r={r + 5}
                    fill="none"
                    stroke="#72b8ff"
                    strokeWidth="1.8"
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
              y={H - PAD_B + (isMobile ? 20 : 22)}
              fill="rgba(251,253,254,0.7)"
              fontFamily="var(--font-mono)"
              fontSize={tickSize}
              textAnchor="middle"
            >
              {h}
            </text>
          ))}
          <text
            x={PAD_L + PW / 2}
            y={H - (isMobile ? 16 : 20)}
            fill="rgba(251,253,254,0.85)"
            fontFamily="var(--font-mono)"
            fontSize={labelSize}
            letterSpacing="0.16em"
            textAnchor="middle"
            fontWeight="600"
          >
            HYPE INDEX (0–100)
          </text>

          {/* Y axis ticks */}
          {[0, 1, 2, 3, 4, 5, 6].map((w) => (
            <text
              key={`yt-${w}`}
              x={PAD_L - (isMobile ? 8 : 14)}
              y={yFor(w) + 4}
              fill="rgba(251,253,254,0.8)"
              fontFamily="var(--font-mono)"
              fontSize={tickSize}
              textAnchor="end"
            >
              {isMobile ? SHORT_ROUND_LABELS[w] : ROUND_LABELS[w]}
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
        className="mb-2 font-mono text-sm uppercase tracking-[0.14em]"
        style={{ color }}
      >
        {arrow} {label}
      </div>
      <div className="flex flex-col gap-1">
        {teams.map((t) => (
          <div
            key={t.team}
            className="grid grid-cols-[44px_1fr_auto] items-center gap-2"
          >
            <span
              className="font-mono text-sm font-bold tabular-nums"
              style={{ color }}
            >
              {t.gap > 0 ? `+${t.gap}` : t.gap}
            </span>
            <span className="truncate font-sans text-sm text-ink">{t.team}</span>
            <span className="font-mono text-sm tabular-nums text-core-bright">
              {String(t.seed).padStart(2, "0")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
