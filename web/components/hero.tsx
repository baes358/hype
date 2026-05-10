import { Dataset } from "@/lib/data";

type Props = {
  data: Dataset;
};

export function Hero({ data }: Props) {
  const { finding } = data;
  const isPlaceholder = finding.includes("TBD");

  return (
    <section className="border-b border-rule/60">
      <div className="mx-auto flex min-h-[80vh] max-w-7xl flex-col justify-center px-5 pt-12 pb-16 sm:px-6 sm:pt-24 sm:pb-28">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-graphite-soft">
          The Gap · {data.metadata.tournament_year} Tournament
        </div>
        <h1
          className={`mt-5 max-w-5xl text-balance font-heading text-3xl font-bold leading-[0.95] tracking-tight sm:mt-6 sm:text-5xl md:text-6xl lg:text-7xl ${
            isPlaceholder ? "text-graphite-soft italic" : "text-ink"
          }`}
        >
          {finding}
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-graphite sm:mt-8">
          HYP3 measures the distance between how loudly the internet talked about each
          team and how far they actually went. <span className="text-ink">Negative gap</span>{" "}
          means a team got more hype than their wins justified.{" "}
          <span className="text-ink">Positive gap</span> means they were robbed of attention.
        </p>
      </div>
    </section>
  );
}
