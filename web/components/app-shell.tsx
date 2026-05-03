"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { BracketGrid } from "@/components/bracket-grid";
import { Filters } from "@/components/filters";
import { GapChart } from "@/components/gap-chart";
import { Hero } from "@/components/hero";
import { ScatterChartView } from "@/components/scatter-chart";
import { SectionNav } from "@/components/section-nav";
import { TeamSheet } from "@/components/team-sheet";
import { TimelineHeatmap } from "@/components/timeline-heatmap";
import {
  Dataset,
  REGIONS,
  Region,
  ROUND_ORDER,
  Round,
  StoryTag,
  TAG_ORDER,
  Team,
  applyRoundFilter,
  maxAbsGap,
  tagCounts,
} from "@/lib/data";

const VALID_TAGS = new Set<string>(TAG_ORDER);
const VALID_REGIONS = new Set<string>(REGIONS);
const VALID_ROUNDS = new Set<string>(ROUND_ORDER);

type Props = {
  data: Dataset;
  view: "gap" | "scatter" | "timeline" | "bracket";
};

const ALL_TAGS = new Set<StoryTag>(TAG_ORDER);

// Reads ?year=YYYY from the URL and asks the parent to swap datasets when
// it differs from the bundled one. Renders nothing — pure side-effect.
//
// Why a separate component: useSearchParams forces its enclosing client-tree
// to client-side render (per Next 16's prerender rules), and it must sit
// inside a <Suspense> boundary or production builds fail. By isolating it
// here, the Suspense fallback is null (this component renders nothing
// anyway) and the rest of AppShell stays SSR'd as today.
function YearSwapper({
  currentYear,
  onSwap,
}: {
  currentYear: number;
  onSwap: (d: Dataset) => void;
}) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const raw = searchParams.get("year");
    if (!raw) return;
    const year = Number.parseInt(raw, 10);
    if (Number.isNaN(year)) return;
    if (year === currentYear) return; // already showing the requested year
    fetch(`/data/${year}.json`)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))
      )
      .then((d: Dataset) => onSwap(d))
      .catch((e) =>
        console.warn(
          `[year=${year}] fetch failed; keeping bundled ${currentYear}:`,
          e
        )
      );
  }, [searchParams, currentYear, onSwap]);
  return null;
}

// Two-way bind URL search params to filter + selected-team state. Two
// effects: one reads URL on mount + every URL change (so browser back/
// forward works), one writes URL on state change. `router.replace` keeps
// history clean. The `readJustSeeded` flag breaks the same-commit race
// where the read effect's setState hasn't landed yet but the write effect
// still runs and would clobber the URL with stale defaults.
//
// Sits inside the same Suspense boundary as YearSwapper for the same Next 16
// reason: useSearchParams forces client-side rendering up to its closest
// boundary, and a static page calling it without Suspense fails the prod
// build.
type UrlSyncState = {
  selectedTags: Set<StoryTag>;
  selectedRegion: Region | "all";
  selectedRound: Round;
  selectedTeam: Team | null;
  teams: Team[];
  setSelectedTags: (s: Set<StoryTag>) => void;
  setSelectedRegion: (r: Region | "all") => void;
  setSelectedRound: (r: Round) => void;
  setSelectedTeam: (t: Team | null) => void;
};

function UrlSync({
  selectedTags,
  selectedRegion,
  selectedRound,
  selectedTeam,
  teams,
  setSelectedTags,
  setSelectedRegion,
  setSelectedRound,
  setSelectedTeam,
}: UrlSyncState) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // Set by the read effect when it schedules a setState; cleared by the
  // write effect on the next commit. Stops the write effect from firing in
  // the same commit as a read-driven setState (where it would still see the
  // pre-setState state and try to "fix" the URL back to defaults).
  const readJustSeeded = useRef(false);

  // Read on every URL change (mount + browser back/forward + manual edits).
  // Each branch content-compares against current state — no setState when
  // they already agree.
  useEffect(() => {
    let didSeed = false;

    const tagsRaw = searchParams.get("tags");
    const parsedTags = tagsRaw
      ? (tagsRaw.split(",").filter((t) => VALID_TAGS.has(t)) as StoryTag[])
      : [];
    const expectedTags =
      parsedTags.length > 0 ? new Set(parsedTags) : ALL_TAGS;
    if (
      expectedTags.size !== selectedTags.size ||
      [...expectedTags].some((t) => !selectedTags.has(t))
    ) {
      setSelectedTags(expectedTags);
      didSeed = true;
    }

    const regionRaw = searchParams.get("region");
    const expectedRegion: Region | "all" =
      regionRaw && VALID_REGIONS.has(regionRaw) ? (regionRaw as Region) : "all";
    if (expectedRegion !== selectedRegion) {
      setSelectedRegion(expectedRegion);
      didSeed = true;
    }

    const roundRaw = searchParams.get("round");
    const expectedRound: Round =
      roundRaw && VALID_ROUNDS.has(roundRaw) ? (roundRaw as Round) : "all";
    if (expectedRound !== selectedRound) {
      setSelectedRound(expectedRound);
      didSeed = true;
    }

    const teamRaw = searchParams.get("team");
    const expectedTeam = teamRaw
      ? teams.find((x) => x.team === teamRaw) ?? null
      : null;
    if (expectedTeam?.team !== selectedTeam?.team) {
      setSelectedTeam(expectedTeam);
      didSeed = true;
    }

    if (didSeed) readJustSeeded.current = true;
    // selectedX deps deliberately omitted — comparing them inside the effect
    // is the whole point. Adding them would make the effect re-fire on
    // user-driven state changes and double-fire with the write effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, teams]);

  // Write on state change. Skipped in the commit immediately after a read
  // seed so the seeded state can land before we serialize.
  useEffect(() => {
    if (readJustSeeded.current) {
      readJustSeeded.current = false;
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (selectedTags.size === TAG_ORDER.length) {
      params.delete("tags");
    } else {
      // Stable order so the URL is canonical regardless of toggle sequence.
      const ordered = TAG_ORDER.filter((t) => selectedTags.has(t));
      params.set("tags", ordered.join(","));
    }

    if (selectedRegion === "all") params.delete("region");
    else params.set("region", selectedRegion);

    if (selectedRound === "all") params.delete("round");
    else params.set("round", selectedRound);

    if (!selectedTeam) params.delete("team");
    else params.set("team", selectedTeam.team);

    const next = params.toString();
    const current = searchParams.toString();
    if (next === current) return;
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [
    selectedTags,
    selectedRegion,
    selectedRound,
    selectedTeam,
    pathname,
    router,
    searchParams,
  ]);

  return null;
}

export function AppShell({ data, view }: Props) {
  // `data` is the bundled (build-time) dataset. After mount, ?year=YYYY may
  // swap it via YearSwapper. All children consume `dataset`, never `data`.
  const [dataset, setDataset] = useState<Dataset>(data);
  const [selectedTags, setSelectedTags] = useState<Set<StoryTag>>(ALL_TAGS);
  const [selectedRegion, setSelectedRegion] = useState<Region | "all">("all");
  const [selectedRound, setSelectedRound] = useState<Round>("all");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const filteredTeams = useMemo(() => {
    const tagRegion = dataset.teams.filter((t) => {
      if (!selectedTags.has(t.story_tag)) return false;
      if (selectedRegion !== "all" && t.region !== selectedRegion) return false;
      return true;
    });
    return applyRoundFilter(tagRegion, selectedRound);
  }, [dataset.teams, selectedTags, selectedRegion, selectedRound]);

  // Counts and bar scale always reflect the FULL dataset, not the filtered view —
  // otherwise filtering rescales the bars and breaks visual comparison.
  const counts = useMemo(() => tagCounts(dataset.teams), [dataset.teams]);
  const scale = useMemo(() => maxAbsGap(dataset.teams), [dataset.teams]);

  // For the timeline heatmap: global max daily hype across all teams × all
  // days, plus the canonical date list. Filters narrow rows but never
  // rescale the color ramp or remove columns.
  const maxDailyHype = useMemo(() => {
    let m = 0;
    for (const t of dataset.teams) for (const d of t.hype_daily) if (d.value > m) m = d.value;
    return m || 1;
  }, [dataset.teams]);
  const windowDates = useMemo(
    () => dataset.teams[0]?.hype_daily.map((d) => d.date) ?? [],
    [dataset.teams]
  );

  const onToggleTag = (tag: StoryTag) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
        // Don't allow zero — empty filter looks broken; reset to all instead.
        if (next.size === 0) return new Set(ALL_TAGS);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const onReset = () => {
    setSelectedTags(new Set(ALL_TAGS));
    setSelectedRegion("all");
    setSelectedRound("all");
  };

  return (
    <>
      <Suspense fallback={null}>
        <YearSwapper
          currentYear={dataset.metadata.tournament_year}
          onSwap={setDataset}
        />
        <UrlSync
          selectedTags={selectedTags}
          selectedRegion={selectedRegion}
          selectedRound={selectedRound}
          selectedTeam={selectedTeam}
          teams={dataset.teams}
          setSelectedTags={setSelectedTags}
          setSelectedRegion={setSelectedRegion}
          setSelectedRound={setSelectedRound}
          setSelectedTeam={setSelectedTeam}
        />
      </Suspense>

      <Hero data={dataset} />
      <SectionNav />

      <Filters
        selectedTags={selectedTags}
        selectedRegion={selectedRegion}
        selectedRound={selectedRound}
        tagCounts={counts}
        onToggleTag={onToggleTag}
        onSetRegion={setSelectedRegion}
        onSetRound={setSelectedRound}
        onReset={onReset}
      />

      {view === "gap" && (
        <GapChart
          teams={filteredTeams}
          maxAbsGap={scale}
          selectedTeam={selectedTeam?.team ?? null}
          onSelect={(t) => setSelectedTeam(t)}
        />
      )}

      {view === "scatter" && (
        <ScatterChartView
          teams={filteredTeams}
          selectedTeam={selectedTeam?.team ?? null}
          onSelect={(t) => setSelectedTeam(t)}
        />
      )}

      {view === "timeline" && (
        <TimelineHeatmap
          teams={filteredTeams}
          windowDates={windowDates}
          maxDailyHype={maxDailyHype}
          selectedTeam={selectedTeam?.team ?? null}
          onSelect={(t) => setSelectedTeam(t)}
        />
      )}

      {view === "bracket" && (
        <BracketGrid
          teams={filteredTeams}
          selectedTeam={selectedTeam?.team ?? null}
          onSelect={(t) => setSelectedTeam(t)}
        />
      )}

      <footer className="mt-auto border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-5 py-5 font-mono text-[9px] uppercase tracking-normal text-muted-foreground sm:gap-x-6 sm:px-6 sm:py-6">
          <span>HYP3 / 001</span>
          <span>·</span>
          <span>Data: Google Trends + 2026 NCAA results</span>
          <span>·</span>
          <span>Pulled {new Date(dataset.metadata.data_pulled_at).toISOString().slice(0, 10)}</span>
        </div>
      </footer>

      <TeamSheet
        team={selectedTeam}
        open={selectedTeam !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTeam(null);
        }}
      />
    </>
  );
}
