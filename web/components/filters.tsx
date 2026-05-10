"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

import { AnimatedToolbar } from "@/components/motion";
import { TeamSearch } from "@/components/team-search";
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
  Team,
} from "@/lib/data";

type Props = {
  teams: Team[];
  selectedTags: Set<StoryTag>;
  selectedRegion: Region | "all";
  selectedRound: Round;
  tagCounts: Record<StoryTag, number>;
  onToggleTag: (tag: StoryTag) => void;
  onSetRegion: (r: Region | "all") => void;
  onSetRound: (r: Round) => void;
  onReset: () => void;
  onSelectTeam: (team: Team) => void;
};

// ---------------------------------------------------------------------------
// FilterDropdown — button + popover panel. Closed state is a low-weight pill;
// active filters get a subtle filled appearance so users can see at a glance
// which categories have been narrowed.
// ---------------------------------------------------------------------------

function FilterDropdown({
  label,
  badge,
  active,
  children,
}: {
  label: string;
  badge?: string | number | null;
  active?: boolean;
  children: (closeMenu: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = active || open;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 sm:py-1 ${
          isActive
            ? "border-foreground/80 bg-foreground/[0.04] text-foreground"
            : "border-border bg-transparent text-foreground hover:border-foreground/40"
        }`}
      >
        <span>{label}</span>
        {badge != null && (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-foreground/10 px-1.5 text-xs font-semibold tabular-nums">
            {badge}
          </span>
        )}
        <ChevronDown
          aria-hidden
          className={`size-4 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-40 mt-2 min-w-[220px] origin-top overflow-hidden rounded-2xl border border-border bg-background p-1 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18),0_2px_4px_-2px_rgba(0,0,0,0.06)] animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={active}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:bg-foreground/[0.04] ${
        active
          ? "text-foreground"
          : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground"
      }`}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        {active && <Check aria-hidden className="size-3.5" />}
      </span>
      <span className="flex flex-1 items-center gap-2">{children}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// FilterChip — active filter pill with a remove button. Semantic palette is
// driven by TAG_STYLE for story tags; region and round chips use a neutral
// muted pill so they don't compete visually with the story colors.
// ---------------------------------------------------------------------------

function FilterChip({
  label,
  tone,
  onRemove,
}: {
  label: string;
  tone?: "neutral" | StoryTag;
  onRemove: () => void;
}) {
  // Low-saturation, sophisticated palette — uses Tailwind 50/200/700 trio per
  // tag. Neutral chip uses zinc.
  const styles =
    !tone || tone === "neutral"
      ? {
          bg: "bg-zinc-50",
          border: "border-zinc-200",
          text: "text-zinc-700",
          hover: "hover:bg-zinc-100",
        }
      : tone === "overhyped"
      ? {
          bg: "bg-rose-50",
          border: "border-rose-200",
          text: "text-rose-700",
          hover: "hover:bg-rose-100",
        }
      : tone === "underhyped"
      ? {
          bg: "bg-sky-50",
          border: "border-sky-200",
          text: "text-sky-700",
          hover: "hover:bg-sky-100",
        }
      : tone === "as_expected"
      ? {
          bg: "bg-amber-50",
          border: "border-amber-200",
          text: "text-amber-700",
          hover: "hover:bg-amber-100",
        }
      : {
          bg: "bg-zinc-50",
          border: "border-zinc-200",
          text: "text-zinc-600",
          hover: "hover:bg-zinc-100",
        };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border py-1 pl-3 pr-1 text-sm font-medium ${styles.bg} ${styles.border} ${styles.text} animate-in fade-in slide-in-from-top-0.5 duration-200`}
    >
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className={`grid size-5 place-items-center rounded-full transition-colors ${styles.hover} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/30`}
      >
        <X aria-hidden className="size-3" />
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Filters — sticky toolbar + active chip row.
// ---------------------------------------------------------------------------

export function Filters({
  teams,
  selectedTags,
  selectedRegion,
  selectedRound,
  tagCounts,
  onToggleTag,
  onSetRegion,
  onSetRound,
  onReset,
  onSelectTeam,
}: Props) {
  const allTagsActive = selectedTags.size === TAG_ORDER.length;
  const tagsCount = allTagsActive ? null : selectedTags.size;
  const regionActive = selectedRegion !== "all";
  const roundActive = selectedRound !== "all";
  const hasActive = !allTagsActive || regionActive || roundActive;

  // Active chips, in stable order: story tags first (by TAG_ORDER), then
  // region, then round. Default state shows nothing.
  const activeStoryTags = !allTagsActive
    ? TAG_ORDER.filter((t) => selectedTags.has(t))
    : [];

  return (
    <AnimatedToolbar className="sticky top-0 z-30 border-b border-border">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-6">
        {/* Toolbar row. Vertical padding lives on AnimatedToolbar so it can
            condense on scroll. */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <FilterDropdown label="Story" badge={tagsCount} active={!allTagsActive}>
            {() =>
              TAG_ORDER.map((tag) => {
                const active = selectedTags.has(tag);
                return (
                  <DropdownItem
                    key={tag}
                    active={active}
                    onClick={() => onToggleTag(tag)}
                  >
                    <span className={`size-2 rounded-full ${TAG_STYLE[tag].dot}`} />
                    <span className="flex-1">{TAG_LABEL[tag]}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {tagCounts[tag]}
                    </span>
                  </DropdownItem>
                );
              })
            }
          </FilterDropdown>

          <FilterDropdown
            label={regionActive ? selectedRegion : "Region"}
            active={regionActive}
          >
            {(close) => (
              <>
                <DropdownItem
                  active={selectedRegion === "all"}
                  onClick={() => {
                    onSetRegion("all");
                    close();
                  }}
                >
                  All regions
                </DropdownItem>
                {REGIONS.map((r) => (
                  <DropdownItem
                    key={r}
                    active={selectedRegion === r}
                    onClick={() => {
                      onSetRegion(r);
                      close();
                    }}
                  >
                    {r}
                  </DropdownItem>
                ))}
              </>
            )}
          </FilterDropdown>

          <FilterDropdown
            label={roundActive ? ROUND_LABEL[selectedRound] : "Round"}
            active={roundActive}
          >
            {(close) =>
              ROUND_ORDER.map((r) => (
                <DropdownItem
                  key={r}
                  active={selectedRound === r}
                  onClick={() => {
                    onSetRound(r);
                    close();
                  }}
                >
                  {ROUND_LABEL[r]}
                </DropdownItem>
              ))
            }
          </FilterDropdown>

          <div className="sm:ml-auto">
            <TeamSearch teams={teams} onSelect={onSelectTeam} />
          </div>

          {hasActive && (
            <button
              type="button"
              onClick={onReset}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Active chips row */}
        {hasActive && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {activeStoryTags.map((tag) => (
              <FilterChip
                key={tag}
                label={TAG_LABEL[tag]}
                tone={tag}
                onRemove={() => onToggleTag(tag)}
              />
            ))}
            {regionActive && (
              <FilterChip
                label={selectedRegion}
                onRemove={() => onSetRegion("all")}
              />
            )}
            {roundActive && (
              <FilterChip
                label={ROUND_LABEL[selectedRound]}
                onRemove={() => onSetRound("all")}
              />
            )}
          </div>
        )}
      </div>
    </AnimatedToolbar>
  );
}
