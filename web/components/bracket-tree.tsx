"use client";

import { Region, REGIONS, StoryTag, Team } from "@/lib/data";

const TAG_COLOR: Record<StoryTag, string> = {
  overhyped: "#f995b6",
  underhyped: "#66e7d8",
  as_expected: "#efecaf",
  noise: "#b4b4ef",
};

const CANONICAL_SEED_ORDER = [1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15];

type RegionTree = {
  r64: (Team | null)[];
  r32: (Team | null)[];
  s16: (Team | null)[];
  e8: (Team | null)[];
  champion: Team | null;
};

function pickWinner(a: Team | null, b: Team | null, minWins: number): Team | null {
  if (!a && !b) return null;
  if (!a) return b!.wins >= minWins ? b : null;
  if (!b) return a.wins >= minWins ? a : null;
  if (a.wins >= minWins && b.wins < minWins) return a;
  if (b.wins >= minWins && a.wins < minWins) return b;
  return a.wins >= b.wins ? a : b;
}

function buildRegionTree(allTeams: Team[], region: Region): RegionTree {
  const inRegion = allTeams.filter(
    (t) => t.region === region && t.made_main_bracket
  );
  const bySeed = new Map<number, Team>();
  for (const t of inRegion) bySeed.set(t.seed, t);

  const r64: (Team | null)[] = CANONICAL_SEED_ORDER.map((s) => bySeed.get(s) ?? null);
  const r32: (Team | null)[] = [];
  for (let i = 0; i < 8; i++) r32.push(pickWinner(r64[2 * i], r64[2 * i + 1], 1));
  const s16: (Team | null)[] = [];
  for (let i = 0; i < 4; i++) s16.push(pickWinner(r32[2 * i], r32[2 * i + 1], 2));
  const e8: (Team | null)[] = [];
  for (let i = 0; i < 2; i++) e8.push(pickWinner(s16[2 * i], s16[2 * i + 1], 3));
  const champion = pickWinner(e8[0], e8[1], 4);

  return { r64, r32, s16, e8, champion };
}

type Props = {
  teams: Team[];
  filteredTeams: Team[];
  selectedRegion: Region | "all";
  selectedTeam: string | null;
  onSelect: (team: Team) => void;
};

export function BracketTree({
  teams,
  filteredTeams,
  selectedRegion,
  selectedTeam,
  onSelect,
}: Props) {
  const visibleTagSet = new Set<StoryTag>(filteredTeams.map((t) => t.story_tag));
  const regionsToShow: Region[] =
    selectedRegion === "all" ? REGIONS : [selectedRegion];
  const trees = regionsToShow.map((r) => ({
    region: r,
    tree: buildRegionTree(teams, r),
  }));
  const champion = teams.find((t) => t.wins === 6) ?? null;

  return (
    <section
      className="relative mx-auto max-w-[1440px]"
      style={{
        padding:
          "clamp(1.5rem, 4vw, 3rem) clamp(1rem, 3vw, 1.75rem) clamp(2rem, 5vw, 4rem)",
      }}
    >
      <header className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:flex-wrap md:items-end md:justify-between md:gap-6">
        <div>
          <div className="mb-3 font-mono text-sm uppercase tracking-[0.14em] text-ink-2">
            <span className="text-core-bright">04</span> /{" "}
            <span className="text-ink-1">The Bracket</span>
          </div>
          <h2
            className="m-0 max-w-[720px] font-display font-bold leading-[1.1] tracking-[-0.01em] text-ink"
            style={{ fontSize: "clamp(22px, 2.6vw, 34px)" }}
          >
            Each region as a{" "}
            <span
              style={{
                color: "transparent",
                WebkitTextStroke: "1.2px var(--core-bright)",
              }}
            >
              tree
            </span>{" "}
            — colored by the story each team ended up telling
          </h2>
          <div className="mt-3 font-mono text-sm uppercase tracking-[0.1em] text-ink-2">
            {teams.length} teams · 4 regions · tap any team
          </div>
        </div>

        <Legend />
      </header>

      <div
        className={`grid gap-4 ${
          regionsToShow.length === 1
            ? "grid-cols-1"
            : "grid-cols-1 xl:grid-cols-2"
        }`}
      >
        {trees.map(({ region, tree }) => (
          <RegionTreeCard
            key={region}
            region={region}
            tree={tree}
            visibleTagSet={visibleTagSet}
            selectedTeam={selectedTeam}
            onSelect={onSelect}
          />
        ))}
      </div>

      {selectedRegion === "all" && (
        <FinalStrip
          teams={teams}
          champion={champion}
          visibleTagSet={visibleTagSet}
          selectedTeam={selectedTeam}
          onSelect={onSelect}
        />
      )}
    </section>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-border bg-[rgba(255,255,255,0.025)] px-3.5 py-2.5">
      {(Object.keys(TAG_COLOR) as StoryTag[]).map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1.5">
          <span
            className="size-2 rounded-[2px]"
            style={{ background: TAG_COLOR[tag] }}
          />
          <span className="font-mono text-sm uppercase tracking-[0.12em] text-ink-1">
            {tag === "as_expected" ? "As expected" : tag.charAt(0).toUpperCase() + tag.slice(1)}
          </span>
        </span>
      ))}
    </div>
  );
}

function BracketConnector({ inCount, outCount }: { inCount: number; outCount: number }) {
  const paths: string[] = [];
  for (let i = 0; i < outCount; i++) {
    const yTopIn = ((i * 2 + 0.5) / inCount) * 100;
    const yBotIn = ((i * 2 + 1.5) / inCount) * 100;
    const yOut = ((i + 0.5) / outCount) * 100;
    paths.push(`M 0 ${yTopIn} L 50 ${yTopIn}`);
    paths.push(`M 0 ${yBotIn} L 50 ${yBotIn}`);
    paths.push(`M 50 ${yTopIn} L 50 ${yBotIn}`);
    paths.push(`M 50 ${yOut} L 100 ${yOut}`);
  }
  return (
    <svg
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
      className="block size-full"
    >
      <g
        stroke="rgba(114,184,255,0.4)"
        strokeWidth="1"
        fill="none"
        vectorEffect="non-scaling-stroke"
      >
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}

type CardProps = {
  team: Team | null;
  selected: boolean;
  dimmed: boolean;
  onSelect: (team: Team) => void;
  large?: boolean;
  highlight?: boolean;
  champion?: boolean;
};

function BracketCard({
  team,
  selected,
  dimmed,
  onSelect,
  large,
  highlight,
  champion,
}: CardProps) {
  if (!team) {
    return (
      <div
        aria-hidden
        className={`w-full rounded-[4px] border border-dashed border-white/[0.05] ${
          large ? "min-h-9 rounded-md" : "min-h-[22px]"
        }`}
      />
    );
  }
  const color = TAG_COLOR[team.story_tag];
  const borderColor = selected ? "var(--core-bright)" : `${color}55`;
  const boxShadow = selected
    ? `0 0 0 1px var(--core-bright), 0 0 24px ${color}66`
    : highlight || champion
    ? `0 0 24px -4px ${color}80`
    : undefined;

  return (
    <button
      type="button"
      onClick={() => onSelect(team)}
      title={`${team.team} — ${team.wins}W (seed ${team.seed})`}
      className={`relative grid w-full cursor-pointer text-left transition-all ${
        large
          ? "grid-cols-[auto_1fr_auto] gap-2 rounded-md px-2.5 py-2"
          : "grid-cols-[auto_1fr] gap-1.5 rounded-[4px] px-2 py-0.5"
      }`}
      style={{
        background: champion
          ? "rgba(18,119,222,0.18)"
          : highlight
          ? "rgba(18,119,222,0.12)"
          : "rgba(0,0,0,0.5)",
        borderColor,
        borderWidth: champion ? 1.5 : 1,
        borderStyle: "solid",
        boxShadow,
        opacity: dimmed ? 0.35 : 1,
        minHeight: large ? 36 : 22,
      }}
    >
      <span
        className="font-mono text-[9px] font-bold tabular-nums"
        style={{ color, minWidth: 14 }}
      >
        {String(team.seed).padStart(2, "0")}
      </span>
      <span className="truncate font-sans text-[10.5px] text-ink">
        {team.team}
      </span>
      {large && (
        <span className="font-mono text-[10px] tabular-nums text-core-bright">
          {team.wins}W
        </span>
      )}
    </button>
  );
}

function RegionTreeCard({
  region,
  tree,
  visibleTagSet,
  selectedTeam,
  onSelect,
}: {
  region: Region;
  tree: RegionTree;
  visibleTagSet: Set<StoryTag>;
  selectedTeam: string | null;
  onSelect: (team: Team) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-1">
      <div className="flex items-center justify-between border-b border-border bg-black/30 px-3.5 py-2.5">
        <span className="font-display text-sm font-bold uppercase tracking-[0.08em] text-ink">
          {region}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
          16 TEAMS
        </span>
      </div>
      <div className="w-full overflow-x-auto">
      <div
        className="grid h-[420px] min-w-[560px] gap-0 px-2.5 py-3 sm:h-[460px] sm:min-w-0 lg:h-[480px]"
        style={{
          gridTemplateColumns:
            "1.4fr 0.5fr 1fr 0.5fr 1fr 0.5fr 1fr 0.5fr 1fr",
        }}
      >
        <div className="flex min-w-0 flex-col justify-around">
          {tree.r64.map((t, i) => (
            <BracketCard
              key={t?.team ?? `r64-${i}`}
              team={t}
              selected={t != null && selectedTeam === t.team}
              dimmed={t != null && !visibleTagSet.has(t.story_tag)}
              onSelect={onSelect}
            />
          ))}
        </div>
        <BracketConnector inCount={16} outCount={8} />
        <div className="flex min-w-0 flex-col justify-around">
          {tree.r32.map((t, i) => (
            <BracketCard
              key={t?.team ?? `r32-${i}`}
              team={t}
              selected={t != null && selectedTeam === t.team}
              dimmed={t != null && !visibleTagSet.has(t.story_tag)}
              onSelect={onSelect}
            />
          ))}
        </div>
        <BracketConnector inCount={8} outCount={4} />
        <div className="flex min-w-0 flex-col justify-around">
          {tree.s16.map((t, i) => (
            <BracketCard
              key={t?.team ?? `s16-${i}`}
              team={t}
              selected={t != null && selectedTeam === t.team}
              dimmed={t != null && !visibleTagSet.has(t.story_tag)}
              onSelect={onSelect}
            />
          ))}
        </div>
        <BracketConnector inCount={4} outCount={2} />
        <div className="flex min-w-0 flex-col justify-around">
          {tree.e8.map((t, i) => (
            <BracketCard
              key={t?.team ?? `e8-${i}`}
              team={t}
              selected={t != null && selectedTeam === t.team}
              dimmed={t != null && !visibleTagSet.has(t.story_tag)}
              onSelect={onSelect}
            />
          ))}
        </div>
        <BracketConnector inCount={2} outCount={1} />
        <div className="flex min-w-0 flex-col justify-center">
          <BracketCard
            team={tree.champion}
            selected={tree.champion != null && selectedTeam === tree.champion.team}
            dimmed={
              tree.champion != null && !visibleTagSet.has(tree.champion.story_tag)
            }
            onSelect={onSelect}
            highlight
          />
        </div>
      </div>
      </div>
    </div>
  );
}

function FinalConnector({ pairs }: { pairs: number }) {
  return (
    <svg
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
      className="block size-full"
    >
      <g
        stroke="rgba(114,184,255,0.45)"
        strokeWidth="0.6"
        strokeDasharray="2.5 3"
        fill="none"
        vectorEffect="non-scaling-stroke"
      >
        {pairs === 2 ? (
          <g>
            <path d="M 0 12.5 L 50 12.5 L 50 37.5 L 100 25 M 0 37.5 L 50 37.5" />
            <path d="M 0 62.5 L 50 62.5 L 50 87.5 L 100 75 M 0 87.5 L 50 87.5" />
          </g>
        ) : (
          <path d="M 0 25 L 50 25 L 50 75 L 0 75 M 50 50 L 100 50" />
        )}
      </g>
    </svg>
  );
}

function FinalStrip({
  teams,
  champion,
  visibleTagSet,
  selectedTeam,
  onSelect,
}: {
  teams: Team[];
  champion: Team | null;
  visibleTagSet: Set<StoryTag>;
  selectedTeam: string | null;
  onSelect: (team: Team) => void;
}) {
  const regionalChamps: (Team | null)[] = REGIONS.map(
    (r) => teams.find((t) => t.region === r && t.wins >= 4) ?? null
  );
  if (regionalChamps.every((t) => t == null)) return null;
  const f4Winners = teams.filter((t) => t.wins >= 5).slice(0, 2);

  return (
    <div className="mt-5 rounded-2xl border border-[rgba(114,184,255,0.2)] bg-[rgba(18,119,222,0.04)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
          <span className="text-core-bright">F4</span> / Championship
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
          regional champs → national champion
        </span>
      </div>
      <div className="w-full overflow-x-auto">
      <div
        className="grid min-w-[640px] items-stretch gap-0"
        style={{
          gridTemplateColumns: "1fr 60px 1fr 60px 1fr",
          minHeight: 200,
        }}
      >
        <div className="flex flex-col justify-around gap-2">
          {regionalChamps.map((t, i) => (
            <BracketCard
              key={t?.team ?? `rc-${i}`}
              team={t}
              selected={t != null && selectedTeam === t.team}
              dimmed={t != null && !visibleTagSet.has(t.story_tag)}
              onSelect={onSelect}
              large
            />
          ))}
        </div>
        <FinalConnector pairs={2} />
        <div className="flex flex-col justify-around gap-2">
          {[0, 1].map((i) => (
            <BracketCard
              key={f4Winners[i]?.team ?? `f4-${i}`}
              team={f4Winners[i] ?? null}
              selected={f4Winners[i] != null && selectedTeam === f4Winners[i].team}
              dimmed={
                f4Winners[i] != null && !visibleTagSet.has(f4Winners[i].story_tag)
              }
              onSelect={onSelect}
              large
            />
          ))}
        </div>
        <FinalConnector pairs={1} />
        <div className="flex flex-col justify-center">
          <div className="flex flex-col items-center gap-2">
            <div
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-core-bright"
              style={{ textShadow: "0 0 12px rgba(114,184,255,0.6)" }}
            >
              ★ NATIONAL CHAMPION
            </div>
            <BracketCard
              team={champion}
              selected={champion != null && selectedTeam === champion.team}
              dimmed={champion != null && !visibleTagSet.has(champion.story_tag)}
              onSelect={onSelect}
              large
              champion
            />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
