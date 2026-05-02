import { Dataset } from "@/lib/data";

type Props = {
  data: Dataset;
};

function formatPulled(iso: string): string {
  if (iso.startsWith("PLACEHOLDER")) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function formatWindow(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, opts)}, ${e.getFullYear()}`;
}

export function Hero({ data }: Props) {
  const { metadata, finding } = data;
  const isPlaceholder = finding.includes("TBD");

  return (
    <section className="border-b border-border">
      {/* Top meta strip — Bloomberg-style data banner */}
      <div className="font-mono text-[10px] uppercase tracking-normal text-muted-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-1 px-6 py-3">
          <span className="text-foreground font-semibold">HYP3 / 001</span>
          <span>·</span>
          <span>{metadata.tournament_year} NCAA Men&rsquo;s Tournament</span>
          <span>·</span>
          <span>Hype window {formatWindow(metadata.hype_window_start, metadata.hype_window_end)}</span>
          <span>·</span>
          <span>{metadata.total_teams} teams</span>
          <span>·</span>
          <span>Pulled {formatPulled(metadata.data_pulled_at)}</span>
        </div>
      </div>

      {/* Hero finding */}
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-20 sm:pt-24 sm:pb-32">
        <div className="font-mono text-[10px] uppercase tracking-normal text-brand">
          The Gap
        </div>
        <h1
          className={`mt-6 max-w-5xl text-balance font-heading text-4xl font-bold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl ${
            isPlaceholder ? "text-muted-foreground italic" : ""
          }`}
        >
          {finding}
        </h1>
        <p className="mt-8 max-w-2xl text-base leading-7 text-muted-foreground">
          HYP3 measures the distance between how loudly the internet talked about each
          team and how far they actually went. <span className="text-foreground">Negative gap</span>{" "}
          means a team got more hype than their wins justified.{" "}
          <span className="text-foreground">Positive gap</span> means they were robbed of attention.
        </p>
      </div>
    </section>
  );
}
