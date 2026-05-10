"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

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

  const select = (team: Team) => {
    onSelect(team);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 sm:py-1 ${
          open
            ? "border-foreground/80 bg-foreground/[0.04] text-foreground"
            : "border-border bg-transparent text-foreground hover:border-foreground/40"
        }`}
      >
        <Search aria-hidden className="size-3.5 text-muted-foreground" />
        <span>Search team</span>
        <ChevronDown
          aria-hidden
          className={`size-4 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Search teams"
          className="absolute inset-x-0 top-full z-40 border-b border-border bg-background animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="mx-auto max-w-7xl px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3 border-b border-border pb-2">
              <Search aria-hidden className="size-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                  if (e.key === "Enter" && matches.length > 0) select(matches[0]);
                }}
                placeholder="Search any of the 68 teams…"
                aria-label="Search teams"
                className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:inline">
                esc to close
              </span>
            </div>
            {matches.length > 0 && (
              <ul className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
                {matches.map((t) => (
                  <li key={t.team}>
                    <button
                      type="button"
                      onClick={() => select(t)}
                      className="flex w-full items-baseline justify-between gap-3 rounded px-2 py-1.5 text-left transition-colors hover:bg-foreground/[0.04] focus-visible:bg-foreground/[0.04] focus-visible:outline-none"
                    >
                      <span className="text-sm text-foreground">{t.team}</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        {String(t.seed).padStart(2, "0")} · {t.region}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
