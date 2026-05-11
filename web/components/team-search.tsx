"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";

import { Team } from "@/lib/data";

type Props = {
  teams: Team[];
  onSelect: (team: Team) => void;
};

const MAX_RESULTS = 8;

export function TeamSearch({ teams, onSelect }: Props) {
  const [open, setOpen] = useState(false);
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

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const select = (team: Team) => {
    onSelect(team);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full sm:w-auto">
      <div
        // Mobile: full width in both states. sm+: animated 152 ↔ 288px pill.
        className={`overflow-hidden rounded-full border transition-[width,border-color,background-color] duration-[220ms] ease-[cubic-bezier(0.32,0.72,0,1)] w-full ${
          open
            ? "sm:w-[288px] border-foreground/80 bg-foreground/[0.04]"
            : "sm:w-[152px] border-border bg-transparent hover:border-foreground/40"
        }`}
      >
        {open ? (
          <div className="flex h-full items-center gap-2 px-4 py-1.5 text-sm font-medium sm:py-1">
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
              // text-base (16px) prevents iOS Safari from auto-zooming on focus;
              // sm:text-sm restores the original 14px visual on tablet and up.
              className="w-full bg-transparent text-base text-foreground placeholder:text-foreground/60 focus:outline-none sm:text-sm"
            />
            <Search aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-haspopup="listbox"
            className="flex h-full w-full items-center justify-between gap-2 px-4 py-1.5 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 sm:py-1"
          >
            <span className="opacity-60">Search team</span>
            <Search aria-hidden className="size-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {open && query && (
        <div
          role="listbox"
          aria-label="Search results"
          className="absolute inset-x-0 top-full z-40 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-background shadow-lg animate-in fade-in slide-in-from-top-1 duration-150 sm:inset-x-auto sm:right-0 sm:w-72"
        >
          {matches.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No matches
            </div>
          ) : (
            <ul className="p-1">
              {matches.map((t) => (
                <li key={t.team}>
                  <button
                    type="button"
                    onClick={() => select(t)}
                    className="flex w-full items-baseline justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-foreground/[0.04] focus-visible:bg-foreground/[0.04] focus-visible:outline-none"
                  >
                    <span className="text-sm text-foreground">{t.team}</span>
                    <span className="text-sm uppercase tracking-[0.12em] text-muted-foreground">
                      <span className="font-mono">{String(t.seed).padStart(2, "0")}</span> · {t.region}
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
