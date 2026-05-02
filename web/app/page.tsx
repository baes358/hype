import data from "@/data.json";

type Team = {
  team: string;
  seed: number;
  region: string;
  wins: number;
  hype_raw: number;
  hype_normalized: number;
  hype_daily: { date: string; value: number }[];
  hype_rank: number;
  performance_rank: number;
  gap: number;
  story_tag: "overhyped" | "underhyped" | "as_expected" | "noise";
};

type Dataset = {
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

const dataset = data as Dataset;

export default function Home() {
  const firstTeam = dataset.teams[0]?.team ?? "(no teams yet — placeholder data.json)";
  return (
    <main className="mx-auto max-w-2xl px-6 py-24 font-sans">
      <h1 className="text-3xl font-semibold tracking-tight">Hyp3 — import smoke test</h1>
      <dl className="mt-8 space-y-3 text-sm">
        <div>
          <dt className="font-medium text-zinc-500">finding</dt>
          <dd>{dataset.finding}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">total_teams</dt>
          <dd>{dataset.teams.length}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">first team</dt>
          <dd>{firstTeam}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">data_pulled_at</dt>
          <dd>{dataset.metadata.data_pulled_at}</dd>
        </div>
      </dl>
    </main>
  );
}
