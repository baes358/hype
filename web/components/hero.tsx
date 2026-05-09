import { Dataset } from "@/lib/data";

type Props = {
  data: Dataset;
};

export function Hero({ data }: Props) {
  const { finding } = data;
  const isPlaceholder = finding.includes("TBD");

  return (
    <section className="border-b border-border">
      {/* Hero finding */}
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-5 pt-12 pb-16 sm:px-6 sm:pt-24 sm:pb-32">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/media/hype-logo.svg"
          alt="HYP3 logo"
          width={54}
          height={56}
          className="mb-6 h-12 w-auto self-start sm:mb-8 sm:h-14"
        />
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
