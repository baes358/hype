import raw from "@/data.json";

export type StoryTag = "overhyped" | "underhyped" | "as_expected" | "noise";
export type Region = "East" | "West" | "South" | "Midwest";

export type Team = {
  team: string;
  seed: number;
  region: Region;
  wins: number;
  hype_raw: number;
  hype_normalized: number;
  hype_daily: { date: string; value: number }[];
  hype_rank: number;
  performance_rank: number;
  gap: number;
  story_tag: StoryTag;
};

export type Dataset = {
  metadata: {
    tournament_year: number;
    hype_window_start: string;
    hype_window_end: string;
    total_teams: number;
    data_pulled_at: string;
  };
  finding: string;
  teams: Team[];
};

export const dataset = raw as Dataset;

export const REGIONS: Region[] = ["East", "West", "South", "Midwest"];

export const TAG_ORDER: StoryTag[] = ["overhyped", "underhyped", "as_expected", "noise"];

export const TAG_LABEL: Record<StoryTag, string> = {
  overhyped: "Overhyped",
  underhyped: "Underhyped",
  as_expected: "As expected",
  noise: "Noise",
};

// Tailwind class fragments for each tag — kept as full literals so the JIT
// picks them up. Edit here to retheme the entire app.
export const TAG_STYLE: Record<
  StoryTag,
  { bar: string; text: string; bg: string; border: string; dot: string }
> = {
  overhyped: {
    bar: "bg-rose-500",
    text: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/40",
    dot: "bg-rose-500",
  },
  underhyped: {
    bar: "bg-sky-400",
    text: "text-sky-300",
    bg: "bg-sky-500/10",
    border: "border-sky-400/40",
    dot: "bg-sky-400",
  },
  as_expected: {
    bar: "bg-amber-400",
    text: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-400/30",
    dot: "bg-amber-400",
  },
  noise: {
    bar: "bg-zinc-600",
    text: "text-zinc-400",
    bg: "bg-zinc-800/40",
    border: "border-zinc-700",
    dot: "bg-zinc-500",
  },
};

export function tagCounts(teams: Team[]): Record<StoryTag, number> {
  const out: Record<StoryTag, number> = {
    overhyped: 0,
    underhyped: 0,
    as_expected: 0,
    noise: 0,
  };
  for (const t of teams) out[t.story_tag] += 1;
  return out;
}

export function maxAbsGap(teams: Team[]): number {
  let m = 0;
  for (const t of teams) {
    const a = Math.abs(t.gap);
    if (a > m) m = a;
  }
  return m || 1;
}
