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
      {/* Dark overlay — gentle ramp instead of stepped bands so there's no
          visible horizontal seam mid-hero. */}
      <div
        aria-hidden
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,10,12,0.72) 0%, rgba(10,10,12,0.58) 45%, rgba(10,10,12,0.88) 95%, var(--bg) 100%)",
        }}
      />
      {/* Bottom fade — tall + early start so the hero blends seamlessly into
          the body --bg below it. Terminal explicitly matches --bg so the
          filter bar sits on the same color. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 z-[1] h-60"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(10,10,12,0.55) 35%, var(--bg) 85%, var(--bg) 100%)",
        }}
      />
      {/* Dot grid overlay on top of the photo */}
      <div aria-hidden className="bg-dotgrid z-[1]" />

      <div
        className="relative z-[2] mx-auto max-w-[1280px]"
        style={{
          padding:
            "clamp(2rem, 6vw, 4.5rem) clamp(1rem, 4vw, 1.75rem) clamp(3rem, 8vw, 6rem)",
        }}
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-border-hi bg-black/45 px-3 py-1.5 font-mono text-sm uppercase tracking-[0.12em] text-ink backdrop-blur">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-overhyped shadow-[0_0_10px_var(--overhyped)]"
            />
            March Madness · {data.metadata.tournament_year}
          </span>
          <span className="font-mono text-sm uppercase tracking-[0.12em] text-ink-2">
            EDITION 03 · ISSUE 12
          </span>
        </div>

        <h1
          className="m-0 mb-6 break-words font-display font-bold leading-[0.95] tracking-[-0.02em]"
          style={{ fontSize: "clamp(1.75rem, 5vw, 3.5rem)" }}
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

        <p className="m-0 mb-8 max-w-2xl text-base leading-relaxed text-ink-1 lg:mb-12 lg:text-[17px]">
          HYP3 measures the distance between how loudly the internet talked
          about each team and how far they actually went.{" "}
          <span className="text-overhyped">Negative gap</span> means a team got
          more hype than their wins justified.{" "}
          <span className="text-underhyped">Positive gap</span> means they were
          robbed of attention.
        </p>

        {/* Stat row — 2×2 on mobile, 4-across on desktop. */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-4">
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
      <div className="mb-2 font-mono text-sm uppercase tracking-[0.14em] text-ink-2">
        {label}
      </div>
      <div
        className="break-words font-display font-bold leading-[1.1] tracking-[-0.01em]"
        style={{
          color,
          fontSize: "clamp(1.125rem, 2.4vw, 1.75rem)",
        }}
      >
        {value}
      </div>
      <div className="mt-2 font-mono text-sm tracking-[0.06em] text-ink-2">
        {sub}
      </div>
    </div>
  );
}

// Unused but exported so other components can import the Team type chain
// without circular concerns when this file is removed in the future.
export type { Team };
