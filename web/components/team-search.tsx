"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";

import { Team } from "@/lib/data";

type Props = {
  teams: Team[];
  onSelect: (team: Team) => void;
  /** Always-expanded full-width variant (mobile bar). */
  fullWidth?: boolean;
};

const MAX_RESULTS = 8;

export function TeamSearch({ teams, onSelect, fullWidth = false }: Props) {
  const [open, setOpen] = useState(fullWidth);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return teams
      .filter((t) => t.team.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS);
  }, [query, teams]);

  // Auto-focus when expanded.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // ⌘K / Ctrl+K opens the input; Escape closes it. Document-level so it works
  // from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Click-outside dismiss — skipped in fullWidth (the input is always
  // open as a permanent mobile bar).
  useEffect(() => {
    if (!open || fullWidth) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open, fullWidth]);

  const select = (team: Team) => {
    onSelect(team);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className={fullWidth ? "relative w-full" : "relative"}>
      {open ? (
        <div
          className={`flex min-h-11 items-center gap-2 rounded-lg border border-core-bright/40 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-ink shadow-[0_0_0_3px_rgba(114,184,255,0.08)] ${
            fullWidth ? "w-full" : "sm:w-[240px]"
          }`}
        >
          <Search aria-hidden className="size-3.5 shrink-0 text-ink-2" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches.length > 0) select(matches[0]);
            }}
            placeholder="Search team"
            aria-label="Search teams"
            // text-base (16px) keeps iOS from auto-zooming on focus.
            className="w-full bg-transparent font-sans text-base text-ink placeholder:text-ink-3 focus:outline-none sm:text-sm"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-haspopup="listbox"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-[rgba(255,255,255,0.03)] px-3 py-2 text-ink-2 transition-colors hover:border-border-hi hover:text-ink-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-core-bright/60"
        >
          <Search aria-hidden className="size-3.5" />
          <span className="font-mono text-sm uppercase tracking-[0.08em]">
            Search teams
          </span>
          <kbd className="rounded border border-border bg-[rgba(255,255,255,0.05)] px-1.5 py-px font-mono text-[11px] text-ink-2">
            ⌘K
          </kbd>
        </button>
      )}

      {open && query && (
        <div
          role="listbox"
          aria-label="Search results"
          className={`absolute top-full z-50 mt-2 overflow-hidden rounded-xl border border-border-hi bg-bg-2 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.7)] ${
            fullWidth
              ? "left-0 right-0 max-h-[60vh] overflow-y-auto"
              : "right-0 w-72"
          }`}
        >
          {matches.length === 0 ? (
            <div className="px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-2">
              No matches
            </div>
          ) : (
            <ul className="p-1">
              {matches.map((t) => (
                <li key={t.team}>
                  <button
                    type="button"
                    onClick={() => select(t)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[rgba(255,255,255,0.04)] focus-visible:bg-[rgba(255,255,255,0.04)] focus-visible:outline-none"
                  >
                    <span className="truncate font-sans text-sm text-ink">
                      {t.team}
                    </span>
                    <span className="font-mono text-sm uppercase tracking-[0.12em] text-ink-2">
                      <span className="text-core-bright tabular-nums">
                        {String(t.seed).padStart(2, "0")}
                      </span>{" "}
                      · {t.region}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
