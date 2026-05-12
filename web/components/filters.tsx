"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  GapMode,
  Region,
  REGIONS,
  ROUND_LABEL,
  ROUND_ORDER,
  Round,
  StoryTag,
  TAG_LABEL,
  TAG_ORDER,
} from "@/lib/data";

// Per-tag accent — raw hex so SVG, inline style, and box-shadow can all share.
const TAG_COLOR: Record<StoryTag, string> = {
  overhyped: "#f995b6",
  underhyped: "#66e7d8",
  as_expected: "#efecaf",
  noise: "#b4b4ef",
};

type Props = {
  mode: GapMode;
  setMode: (m: GapMode) => void;
  selectedTags: Set<StoryTag>;
  selectedRegion: Region | "all";
  selectedRound: Round;
  tagCounts: Record<StoryTag, number>;
  showRoundFilter?: boolean;
  onToggleTag: (tag: StoryTag) => void;
  onSetRegion: (r: Region | "all") => void;
  onSetRound: (r: Round) => void;
  onReset: () => void;
};

export function Filters({
  mode,
  setMode,
  selectedTags,
  selectedRegion,
  selectedRound,
  tagCounts,
  showRoundFilter = true,
  onToggleTag,
  onSetRegion,
  onSetRound,
  onReset,
}: Props) {
  return (
    <div className="sticky top-[var(--hyp3-nav-h,0px)] z-30 border-b border-border bg-[rgba(10,10,12,0.85)] backdrop-blur-xl backdrop-saturate-[140%]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3.5 px-5 pt-4 pb-3 sm:px-7">
        {/* PRIMARY ROW — Scope + Story + total */}
        <div className="flex flex-wrap items-end gap-5">
          <PrimaryGroup marker="A" label="SCOPE">
            <ModeToggle mode={mode} setMode={setMode} />
          </PrimaryGroup>

          <div className="hidden self-stretch border-r border-border sm:block" />

          <PrimaryGroup
            marker="B"
            label="STORY"
            sublabel={
              selectedTags.size === TAG_ORDER.length
                ? "All"
                : `${selectedTags.size} of ${TAG_ORDER.length}`
            }
          >
            <div className="flex flex-wrap gap-1.5">
              {TAG_ORDER.map((tag) => {
                const active = selectedTags.has(tag);
                const color = TAG_COLOR[tag];
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onToggleTag(tag)}
                    aria-pressed={active}
                    className="inline-flex h-[34px] items-center gap-2 rounded-full border px-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] transition-all"
                    style={{
                      borderColor: active ? color : "var(--border)",
                      background: active ? `${color}22` : "transparent",
                      color: active ? color : "var(--ink-1)",
                      opacity: active ? 1 : 0.55,
                    }}
                  >
                    <span
                      aria-hidden
                      className="size-1.5 rounded-full"
                      style={{ background: color }}
                    />
                    {TAG_LABEL[tag]}
                    <span
                      className="ml-0.5 rounded-full border bg-black/30 px-1.5 py-px font-mono text-[10px] tabular-nums"
                      style={{ borderColor: "currentColor" }}
                    >
                      {tagCounts[tag] ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </PrimaryGroup>

        </div>

        {/* SECONDARY ROW — refinements */}
        <div className="flex flex-wrap items-center gap-3.5 border-t border-border pt-2.5">
          <SecondaryGroup label="Region">
            <Segmented
              options={[{ id: "all", label: "All" }, ...REGIONS.map((r) => ({ id: r, label: r }))]}
              value={selectedRegion}
              onChange={(v) => onSetRegion(v as Region | "all")}
            />
          </SecondaryGroup>

          {showRoundFilter && (
            <>
              <div className="h-4 w-px self-center bg-border" />
              <SecondaryGroup label="Round">
                <RoundDropdown value={selectedRound} setValue={onSetRound} />
              </SecondaryGroup>
            </>
          )}

          <div className="ml-auto" />

          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-1 transition-colors hover:border-border-hi hover:text-ink"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden
            >
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Reset filters
          </button>
        </div>
      </div>
    </div>
  );
}

function PrimaryGroup({
  marker,
  label,
  sublabel,
  children,
}: {
  marker: string;
  label: string;
  sublabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="inline-flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-1">
        <span className="inline-flex size-4 items-center justify-center rounded border border-border-hi bg-[rgba(18,119,222,0.15)] text-[9px] text-core-bright">
          {marker}
        </span>
        <span>{label}</span>
        {sublabel && (
          <span className="ml-1 font-mono text-[10px] tracking-[0.1em] text-ink-3">
            {sublabel}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function SecondaryGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-2.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-3">
        {label}
      </span>
      {children}
    </div>
  );
}

function ModeToggle({
  mode,
  setMode,
}: {
  mode: GapMode;
  setMode: (m: GapMode) => void;
}) {
  const modes: { id: GapMode; label: string; sub: string }[] = [
    { id: "tournament", label: "Tournament", sub: "15-day" },
    { id: "season", label: "Season", sub: "5-mo" },
  ];
  return (
    <div className="inline-flex gap-0.5 rounded-xl border border-border bg-[rgba(255,255,255,0.025)] p-1">
      {modes.map((m) => {
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            aria-pressed={active}
            className={`inline-flex h-[34px] items-center gap-2 rounded-lg px-4 transition-all ${
              active
                ? "bg-[rgba(18,119,222,0.22)] text-core-bright shadow-[inset_0_0_0_1px_rgba(114,184,255,0.4)]"
                : "text-ink-2 hover:text-ink"
            }`}
          >
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full bg-core-bright shadow-[0_0_8px_var(--core-bright)]"
              style={{ opacity: active ? 1 : 0.3 }}
            />
            <span className="font-display text-[13px] font-bold uppercase leading-none tracking-[0.08em]">
              {m.label}
            </span>
            <span className="ml-1 border-l border-border pl-1.5 font-mono text-[10px] tracking-[0.1em] text-ink-3">
              {m.sub}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      role="group"
      className="inline-flex rounded-[10px] border border-border bg-[rgba(255,255,255,0.025)] p-[3px]"
    >
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            className={`rounded-[7px] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] transition-all ${
              active
                ? "bg-[rgba(255,255,255,0.06)] text-ink shadow-[inset_0_0_0_1px_var(--border-hi)]"
                : "text-ink-1 hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function RoundDropdown({
  value,
  setValue,
}: {
  value: Round;
  setValue: (r: Round) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-7 min-w-[150px] items-center justify-between gap-2 rounded-lg border border-border bg-transparent px-3 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-1 transition-colors hover:border-border-hi"
      >
        <span>{ROUND_LABEL[value]}</span>
        <ChevronDown
          aria-hidden
          className={`size-2.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%+4px)] z-20 min-w-[200px] overflow-hidden rounded-[10px] border border-border-hi bg-bg-2 p-1 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.7)]"
        >
          {ROUND_ORDER.map((r) => {
            const active = r === value;
            return (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setValue(r);
                  setOpen(false);
                }}
                role="menuitemcheckbox"
                aria-checked={active}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left font-mono text-[11px] uppercase tracking-[0.06em] transition-colors ${
                  active
                    ? "bg-[rgba(255,255,255,0.04)] text-ink"
                    : "text-ink-1 hover:bg-[rgba(255,255,255,0.03)] hover:text-ink"
                }`}
              >
                <span className="w-3 font-mono text-core-bright">
                  {active ? "✓" : ""}
                </span>
                {ROUND_LABEL[r]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
