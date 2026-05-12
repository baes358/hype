"use client";

import { FadeInSection } from "@/components/motion";
import { Region, REGIONS, StoryTag, Team } from "@/lib/data";

type Props = {
  // Full team list — preserves tree structure regardless of filters.
  teams: Team[];
  // Subset matching the active tag filter — used to dim non-matching nodes
  // without removing them from the tree.
  filteredTeams: Team[];
  selectedRegion: Region | "all";
  selectedTeam: string | null;
  onSelect: (team: Team) => void;
};

// Top-to-bottom seed order within a region. Adjacent pairs are R64 matchups
// (1v16, 8v9, 5v12, 4v13, …); pairs of those pairs meet in R32, and so on.
const CANONICAL_SEED_ORDER = [1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15];

type RegionTree = {
  r64: (Team | null)[];
  r32: (Team | null)[];
  s16: (Team | null)[];
  e8: (Team | null)[];
  champion: Team | null;
};

// Winner of (a, b): whichever team's wins meet the minimum for the *next*
// round. If only one team is present, gate on minWins. Equal-wins ties on
// both sides shouldn't occur within a valid bracket region but we fall back
// to the higher-wins team for safety.
function pickWinner(a: Team | null, b: Team | null, minWins: number): Team | null {
  if (!a && !b) return null;
  if (!a) return b!.wins >= minWins ? b : null;
  if (!b) return a.wins >= minWins ? a : null;
  if (a.wins >= minWins && b.wins < minWins) return a;
  if (b.wins >= minWins && a.wins < minWins) return b;
  return a.wins >= b.wins ? a : b;
}

function buildRegionTree(allTeams: Team[], region: Region): RegionTree {
  const inRegion = allTeams.filter((t) => t.region === region && t.made_main_bracket);
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

// ---------------------------------------------------------------------------
// TeamNode — compact card: logo + seed. All other context lives in the sheet.
// ---------------------------------------------------------------------------

type NodeProps = {
  team: Team | null;
  selected: boolean;
  dimmed: boolean;
  onSelect: (team: Team) => void;
  size?: "sm" | "md";
};

function TeamNode({ team, selected, dimmed, onSelect, size = "sm" }: NodeProps) {
  // Below `sm` the node stacks (seed above name) so even very narrow region
  // columns can fit the full team name. At `sm`+ it lays out in a single row.
  const stackedMinH = size === "md" ? "min-h-10" : "min-h-9";
  const inlineH = size === "md" ? "sm:min-h-0 sm:h-9" : "sm:min-h-0 sm:h-7";
  if (!team) {
    return (
      <div
        aria-hidden
        className={`${stackedMinH} ${inlineH} w-full rounded-sm border border-dashed border-rule/40 bg-transparent`}
      />
    );
  }
  const nameCls = size === "md" ? "text-[11px]" : "text-[10px]";
  return (
    <button
      type="button"
      onClick={() => onSelect(team)}
      title={`${team.team} — ${team.wins}W (seed ${team.seed})`}
      style={{ opacity: dimmed ? 0.3 : 1 }}
      className={`group flex w-full flex-col items-start gap-0 rounded-sm border bg-background px-1.5 py-0.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 sm:flex-row sm:items-center sm:gap-1.5 sm:py-0 ${stackedMinH} ${inlineH} ${
        selected
          ? "border-brand ring-2 ring-brand/50 shadow-[0_0_0_1px_var(--brand)]"
          : "border-rule/60 hover:border-foreground/60"
      }`}
    >
      <span className="font-mono text-[9px] tabular-nums w-4 shrink-0 text-brand">
        {team.seed}
      </span>
      <span className={`max-w-full truncate text-foreground/80 group-hover:text-foreground sm:flex-1 ${nameCls}`}>
        {team.team}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// RegionTree — 5 columns (R64 → R32 → S16 → E8 → regional champion). Later
// rounds use `justify-around` so each card visually centers between its pair
// in the round below.
// ---------------------------------------------------------------------------

type RegionTreeProps = {
  region: Region;
  tree: RegionTree;
  selectedTeam: string | null;
  visibleTagSet: Set<StoryTag>;
  onSelect: (team: Team) => void;
};

function RegionTreeView({ region, tree, selectedTeam, visibleTagSet, onSelect }: RegionTreeProps) {
  const renderCol = (
    items: (Team | null)[],
    distribute: "tight" | "around" | "center"
  ) => (
    <div
      className={`flex flex-col ${
        distribute === "tight"
          ? "gap-0.5"
          : distribute === "around"
          ? "justify-around"
          : "justify-center"
      }`}
    >
      {items.map((t, i) => (
        <TeamNode
          key={t ? t.team : `empty-${i}`}
          team={t}
          selected={t != null && selectedTeam === t.team}
          dimmed={t != null && !visibleTagSet.has(t.story_tag)}
          onSelect={onSelect}
        />
      ))}
    </div>
  );

  return (
    <div className="bg-background">
      <div className="flex items-baseline justify-between border-b border-[#11495F] px-3 py-2">
        <h3 className="text-sm uppercase tracking-normal text-foreground">{region}</h3>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {tree.r64.filter(Boolean).length} teams
        </span>
      </div>
      <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-1 px-2 py-3">
        {renderCol(tree.r64, "tight")}
        {renderCol(tree.r32, "around")}
        {renderCol(tree.s16, "around")}
        {renderCol(tree.e8, "around")}
        {renderCol([tree.champion], "center")}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FinalFour — small strip below the four regions: 4 regional champions →
// 2 F4 winners → 1 national champion. No matchup lines (semifinal pairings
// can't be inferred from `wins` alone), just a 4-2-1 cascade.
// ---------------------------------------------------------------------------

function FinalFour({
  teams,
  selectedTeam,
  visibleTagSet,
  onSelect,
}: {
  teams: Team[];
  selectedTeam: string | null;
  visibleTagSet: Set<StoryTag>;
  onSelect: (team: Team) => void;
}) {
  // Region order for visual stability; nullable so empty slots still render
  // (pre-tournament data, etc.)
  const regionalChamps: (Team | null)[] = REGIONS.map(
    (r) => teams.find((t) => t.region === r && t.wins >= 4) ?? null
  );
  const f4Winners = teams.filter((t) => t.wins >= 5);
  const champion = teams.find((t) => t.wins === 6) ?? null;

  // Don't render anything if the tournament hasn't produced regional champions
  // yet — the bracket itself is the whole story in that case.
  if (regionalChamps.every((t) => t == null)) return null;

  return (
    <div className="mt-[2px] bg-background">
      <div className="flex items-baseline justify-between border-b border-[#11495F] px-3 py-2">
        <h3 className="text-sm uppercase tracking-normal text-foreground">Final Four</h3>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          regional champs → national champion
        </span>
      </div>
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 px-3 py-4">
        <div className="flex flex-col gap-1">
          {regionalChamps.map((t, i) => (
            <TeamNode
              key={t ? t.team : `rc-${i}`}
              team={t}
              selected={t != null && selectedTeam === t.team}
              dimmed={t != null && !visibleTagSet.has(t.story_tag)}
              onSelect={onSelect}
              size="md"
            />
          ))}
        </div>
        <div className="flex flex-col justify-around">
          {[0, 1].map((i) => (
            <TeamNode
              key={f4Winners[i]?.team ?? `f4-${i}`}
              team={f4Winners[i] ?? null}
              selected={f4Winners[i] != null && selectedTeam === f4Winners[i].team}
              dimmed={
                f4Winners[i] != null && !visibleTagSet.has(f4Winners[i].story_tag)
              }
              onSelect={onSelect}
              size="md"
            />
          ))}
        </div>
        <div className="flex flex-col justify-center">
          <TeamNode
            team={champion}
            selected={champion != null && selectedTeam === champion.team}
            dimmed={champion != null && !visibleTagSet.has(champion.story_tag)}
            onSelect={onSelect}
            size="md"
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BracketTree — top-level: 4 regions in a responsive grid + F4 strip.
// ---------------------------------------------------------------------------

export function BracketTree({
  teams,
  filteredTeams,
  selectedRegion,
  selectedTeam,
  onSelect,
}: Props) {
  // Tag visibility derives from the filtered set — a team is "visible" if it
  // survived the tag filter. The region filter is handled separately by
  // collapsing the grid to one region; round filter is hidden in this view.
  const visibleTagSet = new Set<StoryTag>(filteredTeams.map((t) => t.story_tag));

  const regionsToShow: Region[] =
    selectedRegion === "all" ? REGIONS : [selectedRegion];

  const trees = regionsToShow.map((r) => ({ region: r, tree: buildRegionTree(teams, r) }));

  // Choose grid columns. Single-region view goes full-width; all-four uses a
  // responsive 1 → 2 → 4 cascade. Containing the trees in a #11495F-divided
  // grid mirrors the editorial divider used elsewhere in the app.
  const gridCols =
    regionsToShow.length === 1
      ? "grid-cols-1"
      : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4";

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-12 md:py-16">
      <FadeInSection>
        <header className="mb-6 flex flex-col items-start gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div>
            <div className="text-sm uppercase tracking-[0.14em] text-graphite-soft">
              <span>04</span> /{" "}
              <span className="font-display tracking-[0.06em]">The bracket</span>
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
              Each region as a tree — click any team for the full story
            </h2>
          </div>
        </header>
      </FadeInSection>

      <div className={`grid gap-[2px] bg-[#11495F] ${gridCols}`}>
        {trees.map(({ region, tree }) => (
          <RegionTreeView
            key={region}
            region={region}
            tree={tree}
            selectedTeam={selectedTeam}
            visibleTagSet={visibleTagSet}
            onSelect={onSelect}
          />
        ))}
      </div>

      {selectedRegion === "all" && (
        <div className="mt-[2px] bg-[#11495F] p-[1px]">
          <FinalFour
            teams={teams}
            selectedTeam={selectedTeam}
            visibleTagSet={visibleTagSet}
            onSelect={onSelect}
          />
        </div>
      )}
    </section>
  );
}
