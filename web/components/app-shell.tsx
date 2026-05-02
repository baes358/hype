"use client";

import { useMemo, useState } from "react";

import { BracketGrid } from "@/components/bracket-grid";
import { Filters } from "@/components/filters";
import { GapChart } from "@/components/gap-chart";
import { Hero } from "@/components/hero";
import { SectionNav } from "@/components/section-nav";
import { TeamSheet } from "@/components/team-sheet";
import {
  Dataset,
  Region,
  StoryTag,
  TAG_ORDER,
  Team,
  maxAbsGap,
  tagCounts,
} from "@/lib/data";

type Props = {
  data: Dataset;
  view: "gap" | "bracket";
};

const ALL_TAGS = new Set<StoryTag>(TAG_ORDER);

export function AppShell({ data, view }: Props) {
  const [selectedTags, setSelectedTags] = useState<Set<StoryTag>>(ALL_TAGS);
  const [selectedRegion, setSelectedRegion] = useState<Region | "all">("all");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const filteredTeams = useMemo(() => {
    return data.teams.filter((t) => {
      if (!selectedTags.has(t.story_tag)) return false;
      if (selectedRegion !== "all" && t.region !== selectedRegion) return false;
      return true;
    });
  }, [data.teams, selectedTags, selectedRegion]);

  // Counts and bar scale always reflect the FULL dataset, not the filtered view —
  // otherwise filtering rescales the bars and breaks visual comparison.
  const counts = useMemo(() => tagCounts(data.teams), [data.teams]);
  const scale = useMemo(() => maxAbsGap(data.teams), [data.teams]);

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
  };

  return (
    <>
      <Hero data={data} />
      <SectionNav />

      <Filters
        selectedTags={selectedTags}
        selectedRegion={selectedRegion}
        tagCounts={counts}
        onToggleTag={onToggleTag}
        onSetRegion={setSelectedRegion}
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

      {view === "bracket" && (
        <BracketGrid
          teams={filteredTeams}
          selectedTeam={selectedTeam?.team ?? null}
          onSelect={(t) => setSelectedTeam(t)}
        />
      )}

      <footer className="mt-auto border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-1 px-6 py-6 font-mono text-[9px] uppercase tracking-normal text-muted-foreground">
          <span>HYP3 / 001</span>
          <span>·</span>
          <span>Data: Google Trends + 2026 NCAA results</span>
          <span>·</span>
          <span>Pulled {new Date(data.metadata.data_pulled_at).toISOString().slice(0, 10)}</span>
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
