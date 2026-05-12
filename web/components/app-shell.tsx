"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { BracketTree } from "@/components/bracket-tree";
import { Filters } from "@/components/filters";
import { GapChart } from "@/components/gap-chart";
import { Hero } from "@/components/hero";
import { ModeBar } from "@/components/mode-bar";
import { ScatterChartView } from "@/components/scatter-chart";
import { TeamSheet } from "@/components/team-sheet";
import { TimelineHeatmap } from "@/components/timeline-heatmap";
import { TopNav } from "@/components/top-nav";
import {
  Dataset,
  GapMode,
  REGIONS,
  Region,
  ROUND_ORDER,
  Round,
  StoryTag,
  TAG_ORDER,
  Team,
  applyRoundFilter,
  maxAbsGap,
  projectTeamForMode,
  tagCounts,
} from "@/lib/data";

const VALID_TAGS = new Set<string>(TAG_ORDER);
const VALID_REGIONS = new Set<string>(REGIONS);
const VALID_ROUNDS = new Set<string>(ROUND_ORDER);
const VALID_MODES = new Set<GapMode>(["tournament", "season"]);

// Module-scope flag flipped to true after the first client-side commit. The
// initial page load goes through SSR/hydration, where the lazy useState
// initializer MUST return the SSR-safe default ("tournament") to avoid a
// hydration mismatch. After that, every client-side route change mounts a
// fresh AppShell on the client only — at which point the lazy initializer
// can safely read sessionStorage synchronously, so the first paint already
// has the correct mode (no flicker from "tournament" → "season").
let hasClientHydrated = false;

function readStoredMode(): GapMode {
  try {
    const s = window.sessionStorage.getItem("hyp3-mode");
    return s === "season" ? "season" : "tournament";
  } catch {
    return "tournament";
  }
}

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
  gapMode: GapMode;
  teams: Team[];
  setSelectedTags: (s: Set<StoryTag>) => void;
  setSelectedRegion: (r: Region | "all") => void;
  setSelectedRound: (r: Round) => void;
  setSelectedTeam: (t: Team | null) => void;
  setGapMode: (m: GapMode) => void;
};

function UrlSync({
  selectedTags,
  selectedRegion,
  selectedRound,
  selectedTeam,
  gapMode,
  teams,
  setSelectedTags,
  setSelectedRegion,
  setSelectedRound,
  setSelectedTeam,
  setGapMode,
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

    // Mode is special: when the URL doesn't specify ?mode=, do NOT force back
    // to "tournament". gapMode is initialized from sessionStorage in AppShell
    // so it persists across route changes (where the URL drops query params).
    // Only react to an explicit mode= in the URL.
    const modeRaw = searchParams.get("mode");
    if (modeRaw && VALID_MODES.has(modeRaw as GapMode)) {
      const expectedMode = modeRaw as GapMode;
      if (expectedMode !== gapMode) {
        setGapMode(expectedMode);
        didSeed = true;
      }
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

    if (gapMode === "tournament") params.delete("mode");
    else params.set("mode", gapMode);

    const next = params.toString();
    const current = searchParams.toString();
    if (next === current) return;
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [
    selectedTags,
    selectedRegion,
    selectedRound,
    selectedTeam,
    gapMode,
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
  // gapMode persists across route changes via sessionStorage.
  // - Server render: typeof window is undefined → "tournament".
  // - First client hydration: hasClientHydrated is still false → "tournament"
  //   (must match SSR HTML to avoid hydration mismatch). The mount effect
  //   below flips the flag and catches up via setGapMode if storage differs.
  // - Subsequent client-side route mounts: hasClientHydrated is true →
  //   lazy init reads sessionStorage synchronously, so the very first paint
  //   already has the correct mode. No flicker.
  const [gapMode, setGapMode] = useState<GapMode>(() => {
    if (typeof window === "undefined") return "tournament";
    if (!hasClientHydrated) return "tournament";
    return readStoredMode();
  });
  // The write effect must skip its first invocation. On the initial page
  // load, the read effect below catches up to sessionStorage by scheduling a
  // setState — but the write effect fires before that re-render lands and
  // would clobber the stored value with the pre-update default. Skipping the
  // first call is harmless on subsequent mounts (lazy init already matches
  // sessionStorage) and necessary on the initial load.
  const skipFirstModeWrite = useRef(true);

  useEffect(() => {
    hasClientHydrated = true;
    // Only meaningful on the initial-load mount, where lazy init returned
    // the SSR-safe default. On every later client-nav mount, lazy init
    // already read sessionStorage and this is a no-op.
    try {
      const stored = window.sessionStorage.getItem("hyp3-mode");
      if (stored === "season" || stored === "tournament") {
        setGapMode((curr) => (curr === stored ? curr : stored));
      }
    } catch {
      // sessionStorage may throw in private mode / strict cookie policies;
      // mode just won't persist, which is fine.
    }
  }, []);

  useEffect(() => {
    if (skipFirstModeWrite.current) {
      skipFirstModeWrite.current = false;
      return;
    }
    try {
      window.sessionStorage.setItem("hyp3-mode", gapMode);
    } catch {
      // see above.
    }
  }, [gapMode]);

  // Project every team's gap/story_tag to match the current mode. Downstream
  // components (gap chart, filters) read t.gap / t.story_tag as if mode-blind.
  // The team sheet receives the original (unprojected) team to render both
  // gap callouts side-by-side.
  const projectedTeams = useMemo(
    () => dataset.teams.map((t) => projectTeamForMode(t, gapMode)),
    [dataset.teams, gapMode]
  );

  const filteredTeams = useMemo(() => {
    const tagRegion = projectedTeams.filter((t) => {
      if (!selectedTags.has(t.story_tag)) return false;
      if (selectedRegion !== "all" && t.region !== selectedRegion) return false;
      return true;
    });
    return applyRoundFilter(tagRegion, selectedRound);
  }, [projectedTeams, selectedTags, selectedRegion, selectedRound]);

  // Counts and bar scale always reflect the FULL projected dataset, not the
  // filtered view — otherwise filtering rescales the bars and breaks visual
  // comparison.
  const counts = useMemo(() => tagCounts(projectedTeams), [projectedTeams]);
  const scale = useMemo(() => maxAbsGap(projectedTeams), [projectedTeams]);

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

  // When a click in gap-chart / bracket / scatter selects a team, the row
  // received is the PROJECTED team (gap/story_tag swapped by mode). For the
  // team sheet we want the ORIGINAL Team so both gap callouts render their
  // true values. Resolve by team name.
  const selectTeamByOriginal = (t: Team | null) => {
    if (t === null) {
      setSelectedTeam(null);
      return;
    }
    const original = dataset.teams.find((x) => x.team === t.team) ?? t;
    setSelectedTeam(original);
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
          gapMode={gapMode}
          teams={dataset.teams}
          setSelectedTags={setSelectedTags}
          setSelectedRegion={setSelectedRegion}
          setSelectedRound={setSelectedRound}
          setSelectedTeam={setSelectedTeam}
          setGapMode={setGapMode}
        />
      </Suspense>

      <TopNav dataset={dataset} />

      <Hero data={dataset} />

      <div id="hyp3-content" className="scroll-mt-[var(--hyp3-nav-h,0px)]">
        <ModeBar mode={gapMode} setMode={setGapMode} />

        <Filters
          teams={dataset.teams}
          selectedTags={selectedTags}
          selectedRegion={selectedRegion}
          selectedRound={selectedRound}
          tagCounts={counts}
          showRoundFilter={view !== "bracket"}
          onToggleTag={onToggleTag}
          onSetRegion={setSelectedRegion}
          onSetRound={setSelectedRound}
          onReset={onReset}
          onSelectTeam={selectTeamByOriginal}
        />

        {view === "gap" && (
          <GapChart
            teams={filteredTeams}
            maxAbsGap={scale}
            selectedTeam={selectedTeam?.team ?? null}
            onSelect={(t) => selectTeamByOriginal(t)}
          />
        )}

        {view === "scatter" && (
          <ScatterChartView
            teams={filteredTeams}
            selectedTeam={selectedTeam?.team ?? null}
            onSelect={(t) => selectTeamByOriginal(t)}
          />
        )}

        {view === "timeline" && (
          <TimelineHeatmap
            teams={filteredTeams}
            mode={gapMode}
            windowDates={windowDates}
            maxDailyHype={maxDailyHype}
            selectedTeam={selectedTeam?.team ?? null}
            onSelect={(t) => selectTeamByOriginal(t)}
          />
        )}

        {view === "bracket" && (
          <BracketTree
            teams={projectedTeams}
            filteredTeams={filteredTeams}
            selectedRegion={selectedRegion}
            selectedTeam={selectedTeam?.team ?? null}
            onSelect={(t) => selectTeamByOriginal(t)}
          />
        )}
      </div>

      <footer className="mt-auto bg-paper-darker">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-14 sm:px-10 sm:py-20">
          <div className="font-display text-5xl leading-none tracking-tight text-ink sm:text-6xl">
            HYP3
          </div>
          <div className="text-lg leading-snug text-ink sm:text-xl">
            <div>Built for the Underdogs.</div>
            <div>&copy; {dataset.metadata.tournament_year} Sophia Bae. All rights reserved.</div>
          </div>
          <div className="flex flex-col gap-3 text-lg text-ink sm:text-xl">
            <a
              href="https://github.com/sophbae99/hype"
              target="_blank"
              rel="noreferrer"
              className="w-fit transition-opacity hover:opacity-60"
            >
              [About the Project]
            </a>
            <a
              href="mailto:sophbae99@gmail.com?subject=HYP3%20correction"
              className="w-fit transition-opacity hover:opacity-60"
            >
              [Submit a Correction]
            </a>
          </div>
        </div>
      </footer>

      <TeamSheet
        team={selectedTeam}
        open={selectedTeam !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTeam(null);
        }}
        hypeWindowStart={dataset.metadata.hype_window_start}
        hypeWindowEnd={dataset.metadata.hype_window_end}
      />
    </>
  );
}
