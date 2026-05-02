"use client";

import { Region, REGIONS, StoryTag, TAG_LABEL, TAG_ORDER, TAG_STYLE } from "@/lib/data";

type Props = {
  selectedTags: Set<StoryTag>;
  selectedRegion: Region | "all";
  tagCounts: Record<StoryTag, number>;
  onToggleTag: (tag: StoryTag) => void;
  onSetRegion: (r: Region | "all") => void;
  onReset: () => void;
};

export function Filters({
  selectedTags,
  selectedRegion,
  tagCounts,
  onToggleTag,
  onSetRegion,
  onReset,
}: Props) {
  const allTagsActive = selectedTags.size === TAG_ORDER.length;
  const anyFilterActive = !allTagsActive || selectedRegion !== "all";

  return (
    <div className="border-y border-border bg-background/60 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          {/* Tag filter group */}
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
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
              className="ml-auto font-mono text-[9px] uppercase tracking-normal text-muted-foreground hover:text-foreground"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
