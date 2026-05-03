"use client";

import {
  Region,
  REGIONS,
  ROUND_LABEL,
  ROUND_ORDER,
  Round,
  StoryTag,
  TAG_LABEL,
  TAG_ORDER,
  TAG_STYLE,
} from "@/lib/data";

type Props = {
  selectedTags: Set<StoryTag>;
  selectedRegion: Region | "all";
  selectedRound: Round;
  tagCounts: Record<StoryTag, number>;
  onToggleTag: (tag: StoryTag) => void;
  onSetRegion: (r: Region | "all") => void;
  onSetRound: (r: Round) => void;
  onReset: () => void;
};

export function Filters({
  selectedTags,
  selectedRegion,
  selectedRound,
  tagCounts,
  onToggleTag,
  onSetRegion,
  onSetRound,
  onReset,
}: Props) {
  const allTagsActive = selectedTags.size === TAG_ORDER.length;
  const anyFilterActive =
    !allTagsActive || selectedRegion !== "all" || selectedRound !== "all";

  return (
    <div className="border-y border-border bg-background/60 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-5 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-col gap-y-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8">
          {/* Tag filter group */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-normal text-muted-foreground">
              Story
            </span>
            {TAG_ORDER.map((tag) => {
              const active = selectedTags.has(tag);
              const style = TAG_STYLE[tag];
              return (
                <button
                  key={tag}
                  onClick={() => onToggleTag(tag)}
                  aria-pressed={active}
                  className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${
                    active
                      ? `${style.border} ${style.bg} text-foreground`
                      : "border-border bg-transparent text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  <span className={`size-1.5 rounded-full ${style.dot}`} />
                  {TAG_LABEL[tag]}
                  <span className="font-mono text-[9px] tabular-nums opacity-60">
                    {tagCounts[tag]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Region filter group */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-normal text-muted-foreground">
              Region
            </span>
            {(["all", ...REGIONS] as const).map((r) => {
              const active = selectedRegion === r;
              return (
                <button
                  key={r}
                  onClick={() => onSetRegion(r)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-transparent text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  {r === "all" ? "All" : r}
                </button>
              );
            })}
          </div>

          {anyFilterActive && (
            <button
              onClick={onReset}
              className="self-start font-mono text-[9px] uppercase tracking-normal text-muted-foreground hover:text-foreground sm:ml-auto sm:self-auto"
            >
              Reset
            </button>
          )}
        </div>

        {/* Round filter — own row, two-line pills with date subtitles */}
        <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4">
          <span className="font-mono text-[9px] uppercase tracking-normal text-muted-foreground">
            Round
          </span>
          {ROUND_ORDER.map((r) => {
            const active = selectedRound === r;
            return (
              <button
                key={r}
                onClick={() => onSetRound(r)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-normal transition ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-transparent text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                }`}
              >
                {ROUND_LABEL[r]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
