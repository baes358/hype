"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";

import { Team } from "@/lib/data";

type Props = {
  teams: Team[];
  onSelect: (team: Team) => void;
};

const MAX_RESULTS = 6;

export function TeamSearch({ teams, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
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
    setHighlighted(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [isOpen]);

  const select = (team: Team) => {
    onSelect(team);
    setQuery("");
    setIsOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, Math.max(matches.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (matches[highlighted]) select(matches[highlighted]);
    } else if (e.key === "Escape") {
      setQuery("");
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full sm:w-auto">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search team"
        aria-label="Search team"
        className="w-full rounded-full border border-border bg-transparent py-1.5 pl-3 pr-10 text-base text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none sm:w-56 sm:py-1 sm:text-sm"
      />
      <button
        type="button"
        onClick={() => {
          // If the user has typed something, jump to the highlighted match.
          // Otherwise, treat the icon click as "focus the search box".
          if (matches[highlighted]) {
            select(matches[highlighted]);
          } else {
            inputRef.current?.focus();
            setIsOpen(true);
          }
        }}
        aria-label="Search"
        className="absolute right-1 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
      >
        <Search aria-hidden className="size-3.5" />
      </button>
      {isOpen && query && (
        <div className="absolute right-0 top-full z-50 mt-1 w-full overflow-hidden rounded-2xl border border-border bg-background shadow-lg sm:w-64">
          {matches.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No matches
            </div>
          ) : (
            matches.map((t, i) => (
              <button
                key={t.team}
                onClick={() => select(t)}
                onMouseEnter={() => setHighlighted(i)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition ${
                  i === highlighted ? "bg-foreground/5" : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {String(t.seed).padStart(2, "0")}
                  </span>
                  <span className="text-foreground">{t.team}</span>
                </span>
                <span className="text-xs uppercase tracking-normal text-muted-foreground">
                  {t.region}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
