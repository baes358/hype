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
  made_main_bracket: boolean;
  logo_path: string | null;
};

export type Round = "all" | "first" | "second" | "sweet16" | "elite8" | "final4";

export const ROUND_ORDER: Round[] = ["all", "first", "second", "sweet16", "elite8", "final4"];

export const ROUND_LABEL: Record<Round, string> = {
  all: "All 68",
  first: "First Round",
  second: "Second Round",
  sweet16: "Sweet 16",
  elite8: "Elite Eight",
  final4: "Final Four",
};

export function applyRoundFilter(teams: Team[], round: Round): Team[] {
  switch (round) {
    case "all":     return teams;
    case "first":   return teams.filter((t) => t.made_main_bracket);
    case "second":  return teams.filter((t) => t.wins >= 1);
    case "sweet16": return teams.filter((t) => t.wins >= 2);
    case "elite8":  return teams.filter((t) => t.wins >= 3);
    case "final4":  return teams.filter((t) => t.wins >= 4);
  }
}

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
    text: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-500/50",
    dot: "bg-rose-500",
  },
  underhyped: {
    bar: "bg-sky-500",
    text: "text-sky-700",
    bg: "bg-sky-50",
    border: "border-sky-500/50",
    dot: "bg-sky-500",
  },
  as_expected: {
    bar: "bg-amber-500",
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-500/40",
    dot: "bg-amber-500",
  },
  noise: {
    bar: "bg-zinc-400",
    text: "text-zinc-500",
    bg: "bg-zinc-100",
    border: "border-zinc-300",
    dot: "bg-zinc-400",
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
