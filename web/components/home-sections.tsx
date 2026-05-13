"use client";

import type React from "react";
import { useState } from "react";

import { Icon } from "@/components/icon";

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is HYP3?",
    a: "HYP3 measures the distance between how loudly the internet talked about each NCAA tournament team and how far they actually went. We collect Google Trends search-interest data over the 15 days around Selection Sunday, normalize it across teams, and compare the resulting hype rank to each team's tournament-win rank. The gap is the story.",
  },
  {
    q: "How is hype measured?",
    a: "We pull daily Google Trends interest for every team using disambiguated query strings (e.g. \"Texas Longhorns basketball\" not \"Texas basketball\"). Each batch is normalized against a reference team — a high-volume program with sustained search interest across the entire window (Michigan for 2026) — so values across batches are comparable. We then take the unrounded daily mean across the 15-day window and normalize it 0–100 across the field.",
  },
  {
    q: "What does the gap mean?",
    a: "Each team gets a hype rank (1–68, most-hyped to least) and a performance rank (1–68, most wins to fewest). Gap = hype_rank − performance_rank. Negative means overhyped (more hype than wins). Positive means underhyped (more wins than hype). Zero means the internet got it right.",
  },
  {
    q: "Why does it matter?",
    a: "March Madness is a referendum on attention. The teams that dominate the discourse aren't always the teams that survive on the court. HYP3 makes that disconnect legible, overhyped flameouts, underhyped sleepers, and the quiet \"as expected\" middle.",
  },
  {
    q: "Tournament view vs. season view?",
    a: "Tournament mode uses a 15-day window centered on Selection Sunday. Season mode uses the full season — Nov 1 through Selection Sunday + 9 days — which includes the tournament itself. Each mode has its own hype, performance, and gap fields. Switch between them in the filter bar at the top of any data page.",
  },
  {
    q: "Which years are available?",
    a: "The bundled dataset is 2026. The 2025 dataset is also served and can be loaded via the year query parameter (e.g. /divergent?year=2025). Each year has its own reference team and methodology notes.",
  },
];

export function AboutSection() {
  return (
    <section
      id="about"
      className="relative border-b border-border bg-bg"
      style={{
        padding:
          "clamp(3rem, 7vw, 5rem) clamp(1.25rem, 4vw, 2rem) clamp(3rem, 7vw, 5rem)",
      }}
    >
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-3 font-mono text-sm uppercase tracking-[0.14em] text-ink-2">
          <span className="text-core-bright">01</span> /{" "}
          <span className="text-ink-1">About HYP3</span>
        </div>
        <h2
          className="m-0 mb-8 font-display font-bold leading-[1.4em] tracking-[-0.01em] text-ink"
          style={{ fontSize: "clamp(28px, 4.5vw, 48px)" }}
        >
          A 72-hour capstone measuring the{" "}
          <span
            style={{
              color: "transparent",
              WebkitTextStroke: "1.2px var(--core-bright)",
            }}
          >
            distance
          </span>{" "}
          between attention and outcome.
        </h2>
        <div className="grid grid-cols-1 gap-x-12 gap-y-6 lg:grid-cols-2">
          <p className="m-0 text-base leading-relaxed text-ink-1 lg:text-[17px]">
            Every March, basketball Twitter, ESPN, and Google deliver a verdict
            on who&apos;s about to dominate the bracket. Then the actual games
            happen, and the verdict turns out to be wrong about half the time.
            HYP3 puts a number on that.
          </p>
          <p className="m-0 text-base leading-relaxed text-ink-1 lg:text-[17px]">
            The pipeline is small: pull Google Trends data with{" "}
            <code className="font-mono text-sm text-core-bright">pytrends</code>
            , normalize across queries with a reference-team anchor, and rank
            the field on both axes. The output is a single dataset that
            visualizes the hype gap, overhyped, underhyped, as expected, or
            noise, for every team in the field.
          </p>
        </div>
      </div>
    </section>
  );
}

export function FAQSection() {
  return (
    <section
      id="faqs"
      className="relative border-b border-border bg-bg-1"
      style={{
        padding:
          "clamp(3rem, 7vw, 5rem) clamp(1.25rem, 4vw, 2rem) clamp(3rem, 7vw, 5rem)",
      }}
    >
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-3 font-mono text-sm uppercase tracking-[0.14em] text-ink-2">
          <span className="text-core-bright">02</span> /{" "}
          <span className="text-ink-1">FAQs</span>
        </div>
        <h2
          className="m-0 mb-10 font-display font-bold leading-[1.4em] tracking-[-0.01em] text-ink"
          style={{ fontSize: "clamp(28px, 4.5vw, 48px)" }}
        >
          Questions, answered.
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-black/30">
          {FAQS.map((item, i) => (
            <FAQItem
              key={item.q}
              q={item.q}
              a={item.a}
              isLast={i === FAQS.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({
  q,
  a,
  isLast,
}: {
  q: string;
  a: string;
  isLast: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={isLast ? "" : "border-b border-border"}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors hover:bg-[rgba(255,255,255,0.02)] sm:px-7"
      >
        <span className="font-display text-[16px] font-bold leading-[1.3] tracking-[-0.005em] text-ink sm:text-[18px]">
          {q}
        </span>
        <Icon
          name="down-arrow"
          size={16}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-6 sm:px-7">
          <p className="m-0 max-w-[820px] text-base leading-[1.65] text-ink-1">
            {a}
          </p>
        </div>
      )}
    </div>
  );
}

export function ApiSection() {
  return (
    <section
      id="api"
      className="relative border-b border-border bg-bg"
      style={{
        padding:
          "clamp(3rem, 7vw, 5rem) clamp(1.25rem, 4vw, 2rem) clamp(3rem, 7vw, 5rem)",
      }}
    >
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-3 font-mono text-sm uppercase tracking-[0.14em] text-ink-2">
          <span className="text-core-bright">03</span> /{" "}
          <span className="text-ink-1">API & Data</span>
        </div>
        <h2
          className="m-0 mb-8 font-display font-bold leading-[1.4em] tracking-[-0.01em] text-ink"
          style={{ fontSize: "clamp(28px, 4.5vw, 48px)" }}
        >
          Use the dataset.
        </h2>
        <p className="m-0 mb-8 max-w-[720px] text-base leading-relaxed text-ink-1 lg:text-[17px]">
          HYP3 has no backend. Every year&apos;s analysis is a static JSON file
          you can fetch directly. Drop it into a notebook, a sketch, a
          dashboard, anywhere.
        </p>

        <div className="mb-8 grid grid-cols-1 gap-3">
          <ApiRow
            method="GET"
            path="/data/2026.json"
            note="Bundled with this app. Full 2026 dataset."
          />
          <ApiRow
            method="GET"
            path="/data/2025.json"
            note="Florida championship year."
          />
        </div>

        <div className="mb-3 font-mono text-sm uppercase tracking-[0.14em] text-ink-1">
          Schema <Icon name="bullet" size={6} className="mx-1.5 inline-block align-middle" /> per team
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-black/40">
          <table className="w-full border-collapse text-left font-mono text-sm">
            <thead>
              <tr className="border-b border-border bg-black/30">
                <th className="px-4 py-2.5 text-[11px] uppercase tracking-[0.12em] text-ink-2">
                  Field
                </th>
                <th className="px-4 py-2.5 text-[11px] uppercase tracking-[0.12em] text-ink-2">
                  Type
                </th>
                <th className="px-4 py-2.5 text-[11px] uppercase tracking-[0.12em] text-ink-2">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              <SchemaRow field="team" type="string" desc="Team name (matches NCAA bracket)" />
              <SchemaRow field="seed" type="number" desc="Tournament seed 1–16" />
              <SchemaRow
                field="region"
                type="enum"
                desc={
                  <>
                    East
                    <Icon name="bullet" size={6} className="mx-1.5 inline-block align-middle" />
                    West
                    <Icon name="bullet" size={6} className="mx-1.5 inline-block align-middle" />
                    South
                    <Icon name="bullet" size={6} className="mx-1.5 inline-block align-middle" />
                    Midwest
                  </>
                }
              />
              <SchemaRow field="wins" type="number" desc="Tournament wins 0–7 (incl. First Four)" />
              <SchemaRow field="hype_normalized" type="number" desc="Hype 0–100 across the field" />
              <SchemaRow field="hype_rank" type="number" desc="1 = most hyped" />
              <SchemaRow field="performance_rank" type="number" desc="1 = most wins (min-rank)" />
              <SchemaRow field="gap" type="number" desc="hype_rank − performance_rank" />
              <SchemaRow
                field="story_tag"
                type="enum"
                desc={
                  <>
                    overhyped
                    <Icon name="bullet" size={6} className="mx-1.5 inline-block align-middle" />
                    underhyped
                    <Icon name="bullet" size={6} className="mx-1.5 inline-block align-middle" />
                    as_expected
                    <Icon name="bullet" size={6} className="mx-1.5 inline-block align-middle" />
                    noise
                  </>
                }
              />
              <SchemaRow field="hype_daily" type="array" desc="Daily hype series in the tournament window" />
              <SchemaRow field="season_*" type="various" desc="Parallel fields for full-season mode" last />
            </tbody>
          </table>
        </div>

        <div className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
          Methodology <Icon name="bullet" size={5} className="mx-1.5 inline-block align-middle" /> see{" "}
          <a
            href="https://github.com/baes358/hype"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-core-bright underline decoration-core-bright/40 underline-offset-4 transition-colors hover:decoration-core-bright"
          >
            github.com/baes358/hype
            <Icon name="upright-arrow" size={10} />
          </a>
        </div>
      </div>
    </section>
  );
}

function ApiRow({
  method,
  path,
  note,
}: {
  method: string;
  path: string;
  note: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-black/30 px-4 py-3">
      <span className="rounded-md border border-core-bright/40 bg-[rgba(18,119,222,0.16)] px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-core-bright">
        {method}
      </span>
      <code className="font-mono text-sm text-ink">{path}</code>
      <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.1em] text-ink-2">
        {note}
      </span>
    </div>
  );
}

function SchemaRow({
  field,
  type,
  desc,
  last,
}: {
  field: string;
  type: string;
  desc: React.ReactNode;
  last?: boolean;
}) {
  return (
    <tr className={last ? "" : "border-b border-border"}>
      <td className="px-4 py-2 text-core-bright">{field}</td>
      <td className="px-4 py-2 text-ink-2">{type}</td>
      <td className="px-4 py-2 text-ink-1">{desc}</td>
    </tr>
  );
}

export function SourcesSection() {
  return (
    <section
      id="sources"
      className="relative border-b border-border bg-bg-1"
      style={{
        padding:
          "clamp(3rem, 7vw, 5rem) clamp(1.25rem, 4vw, 2rem) clamp(3rem, 7vw, 5rem)",
      }}
    >
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-3 font-mono text-sm uppercase tracking-[0.14em] text-ink-2">
          <span className="text-core-bright">04</span> /{" "}
          <span className="text-ink-1">External Sources</span>
        </div>
        <h2
          className="m-0 mb-8 font-display font-bold leading-[1.4em] tracking-[-0.01em] text-ink"
          style={{ fontSize: "clamp(28px, 4.5vw, 48px)" }}
        >
          Where the data lives.
        </h2>
        <p className="m-0 mb-8 max-w-[720px] text-base leading-relaxed text-ink-1 lg:text-[17px]">
          Every number on this site traces back to one of four upstream
          sources. All pulls are cached locally — the live site never calls
          these endpoints at request time.
        </p>
        <div className="grid grid-cols-1 gap-3">
          <SourceCard
            label="Google Trends"
            href="https://trends.google.com/trends/"
            display="trends.google.com"
            note="Daily search-interest curves for every team. Cross-batch normalized against an anchor team to make values comparable across pytrends batches."
          />
          <SourceCard
            label="pytrends"
            href="https://github.com/GeneralMills/pytrends"
            display="github.com/GeneralMills/pytrends"
            note="Unofficial Google Trends API. Fetches the daily series in batches of five teams plus a shared reference."
          />
          <SourceCard
            label="NCAA bracket + standings"
            href="https://ncaa-api.henrygd.me/"
            display="ncaa-api.henrygd.me"
            note="Third-party wrapper over the NCAA's public bracket and standings endpoints. Source of wins, season_wins, season_losses, region, and seed."
          />
          <SourceCard
            label="NCAA team logos"
            href="https://ncaa-api.henrygd.me/"
            display="ncaa-api.henrygd.me/logo"
            note="SVG team logos fetched once via the same wrapper and committed to web/public/logos/ so the live site can serve them as static assets."
          />
        </div>
      </div>
    </section>
  );
}

function SourceCard({
  label,
  href,
  display,
  note,
}: {
  label: string;
  href: string;
  display: string;
  note: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-black/30 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <span className="shrink-0 rounded-md border border-core-bright/40 bg-[rgba(18,119,222,0.16)] px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-core-bright">
        {label}
      </span>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex shrink-0 items-center gap-1.5 font-mono text-sm text-ink underline decoration-core-bright/40 underline-offset-4 transition-colors hover:decoration-core-bright"
      >
        {display}
        <Icon name="upright-arrow" size={10} />
      </a>
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] leading-[1.5] text-ink-2 sm:ml-auto sm:text-right">
        {note}
      </span>
    </div>
  );
}
