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

// Parse the ISO date string directly — `new Date("YYYY-MM-DD")` reads as
// UTC midnight, and `.toLocaleDateString()` then shifts to the viewer's
// local timezone, subtracting a day in any negative-offset zone (US is
// UTC-5 to -8). Same trap previously fixed in timeline-heatmap.tsx.
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function formatWindow(start: string, end: string): string {
  const [, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  return `${MONTHS_SHORT[sm - 1]} ${sd} – ${MONTHS_SHORT[em - 1]} ${ed}, ${ey}`;
}

export function Hero({ data }: Props) {
  const { metadata, finding } = data;
  const isPlaceholder = finding.includes("TBD");

  return (
    <section className="border-b border-border">
      {/* Top meta strip — Bloomberg-style data banner */}
      <div className="font-mono text-[10px] uppercase tracking-normal text-muted-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 sm:gap-x-6 sm:px-6">
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
      <div className="mx-auto max-w-7xl px-5 pt-12 pb-16 sm:px-6 sm:pt-24 sm:pb-32">
        <div className="font-mono text-[10px] uppercase tracking-normal text-brand">
          The Gap
        </div>
        <h1
          className={`mt-5 max-w-5xl text-balance font-heading text-3xl font-bold leading-[0.95] tracking-tight sm:mt-6 sm:text-5xl md:text-6xl lg:text-7xl ${
            isPlaceholder ? "text-muted-foreground italic" : ""
          }`}
        >
          {finding}
        </h1>
        <p className="mt-6 max-w-2xl text-sm leading-6 text-muted-foreground sm:mt-8 sm:text-base sm:leading-7">
          HYP3 measures the distance between how loudly the internet talked about each
          team and how far they actually went. <span className="text-foreground">Negative gap</span>{" "}
          means a team got more hype than their wins justified.{" "}
          <span className="text-foreground">Positive gap</span> means they were robbed of attention.
        </p>
      </div>
    </section>
  );
}
