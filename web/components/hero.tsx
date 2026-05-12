import { Dataset, Team } from "@/lib/data";

type Props = { data: Dataset };

export function Hero({ data }: Props) {
  const teams = data.teams;
  const sortedByGap = [...teams].sort((a, b) => a.gap - b.gap);
  const mostOver = sortedByGap[0];
  const mostUnder = sortedByGap[sortedByGap.length - 1];
  const overCount = teams.filter((t) => t.story_tag === "overhyped").length;
  const underCount = teams.filter((t) => t.story_tag === "underhyped").length;

  return (
    <section className="relative isolate overflow-hidden border-b border-border">
      {/* Crossfading champion photos */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{
          backgroundImage: "url(/media/champ1.png)",
          animation: "hero-fade-a 12s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{
          backgroundImage: "url(/media/champ2.png)",
          animation: "hero-fade-b 12s ease-in-out infinite",
        }}
      />
      {/* Heavy dark overlay + bottom fade */}
      <div
        aria-hidden
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,10,12,0.78) 0%, rgba(10,10,12,0.55) 30%, rgba(10,10,12,0.78) 80%, rgba(10,10,12,0.95) 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 z-[1] h-36"
        style={{ background: "linear-gradient(180deg, transparent, var(--bg) 95%)" }}
      />
      {/* Dot grid overlay on top of the photo */}
      <div aria-hidden className="bg-dotgrid z-[1]" />

      <div className="relative z-[2] mx-auto max-w-[1280px] px-5 pt-14 pb-20 sm:px-7 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-28">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-border-hi bg-black/45 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink backdrop-blur">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-overhyped shadow-[0_0_10px_var(--overhyped)]"
            />
            March Madness · {data.metadata.tournament_year} Tournament
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
            EDITION 03 · ISSUE 12
          </span>
        </div>

        <h1
          className="m-0 mb-6 break-words font-display font-bold leading-[0.95] tracking-[-0.02em]"
          style={{ fontSize: "clamp(36px, 7vw, 96px)" }}
        >
          <span className="text-ink">HYPE</span>{" "}
          <span className="italic font-normal text-ink-2">vs.</span>{" "}
          <span
            style={{
              color: "transparent",
              WebkitTextStroke: "1.5px var(--core-bright)",
              textShadow: "0 0 60px rgba(114,184,255,0.35)",
            }}
          >
            PERFORMANCE
          </span>
        </h1>

        <p className="m-0 mb-10 max-w-2xl text-[15px] leading-[1.55] text-ink-1 sm:text-base sm:leading-relaxed lg:mb-12 lg:text-[17px]">
          HYP3 measures the distance between how loudly the internet talked
          about each team and how far they actually went.{" "}
          <span className="text-overhyped">Negative gap</span> means a team got
          more hype than their wins justified.{" "}
          <span className="text-underhyped">Positive gap</span> means they were
          robbed of attention.
        </p>

        {/* Stat row — 4 evenly-spaced cards. Centered horizontally with
            consistent baseline so values sit at the same vertical line.
            Below sm: stack 1-up; sm: 2-up; lg: 4-up. */}
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Most overhyped"
            value={mostOver?.team ?? "—"}
            sub={mostOver ? `gap ${mostOver.gap}` : "—"}
            color="var(--overhyped)"
          />
          <StatCard
            label="Most underhyped"
            value={mostUnder?.team ?? "—"}
            sub={mostUnder ? `gap +${mostUnder.gap}` : "—"}
            color="var(--underhyped)"
          />
          <StatCard
            label="Overhyped flameouts"
            value={`${overCount}`}
            sub={`of ${teams.length} teams`}
            color="var(--ink)"
          />
          <StatCard
            label="Underhyped sleepers"
            value={`${underCount}`}
            sub={`of ${teams.length} teams`}
            color="var(--ink)"
          />
        </div>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="flex h-full flex-col bg-black/60 p-4 backdrop-blur sm:p-5 lg:p-6">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
        {label}
      </div>
      <div
        className="break-words font-display font-bold leading-[1.05] tracking-[-0.01em]"
        style={{
          color,
          fontSize: "clamp(18px, 2.6vw, 30px)",
        }}
      >
        {value}
      </div>
      <div className="mt-2 font-mono text-[10px] tracking-[0.06em] text-ink-2 sm:text-[11px]">
        {sub}
      </div>
    </div>
  );
}

// Unused but exported so other components can import the Team type chain
// without circular concerns when this file is removed in the future.
export type { Team };
