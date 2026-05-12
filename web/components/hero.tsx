import { Dataset } from "@/lib/data";

type Props = {
  data: Dataset;
};

export function Hero({ data }: Props) {
  const { finding } = data;
  const isPlaceholder = finding.includes("TBD");

  return (
    <section className="relative isolate overflow-hidden border-b border-rule">
      {/* Two background layers crossfading on phase-shifted opacity cycles. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url(/media/champ1.png)",
          animation: "hero-fade-a 10s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url(/media/champ2.png)",
          animation: "hero-fade-b 10s ease-in-out infinite",
        }}
      />
      {/* Dark overlay for text contrast. */}
      <div aria-hidden className="absolute inset-0 bg-black/55" />

      <div className="relative mx-auto flex min-h-[80vh] max-w-7xl flex-col justify-center px-5 pt-12 pb-16 sm:px-6 sm:pt-24 sm:pb-28">
        <div className="text-sm uppercase tracking-[0.14em] text-white">
          March Madness · <span className="font-mono">{data.metadata.tournament_year}</span> Tournament
        </div>
        <h1
          className={`mt-5 max-w-5xl text-balance font-heading text-3xl font-bold leading-[0.95] tracking-tight sm:mt-6 sm:text-5xl md:text-6xl lg:text-7xl ${
            isPlaceholder ? "text-white italic" : "text-white"
          }`}
        >
          {finding}
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-white sm:mt-8">
          HYP3 measures the distance between how loudly the internet talked about each
          team and how far they actually went. <span className="text-white">Negative gap</span>{" "}
          means a team got more hype than their wins justified.{" "}
          <span className="text-white">Positive gap</span> means they were robbed of attention.
        </p>
      </div>
    </section>
  );
}
