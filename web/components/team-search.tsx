"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
    <div ref={wrapperRef} className="relative">
      <input
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
        className="w-36 rounded border border-border bg-transparent px-2 py-1 font-mono text-[10px] uppercase tracking-normal text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none sm:w-48"
      />
      {isOpen && query && (
        <div className="absolute right-0 top-full z-20 mt-1 w-64 overflow-hidden rounded border border-border bg-background shadow-lg">
          {matches.length === 0 ? (
            <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-normal text-muted-foreground">
              No matches
            </div>
          ) : (
            matches.map((t, i) => (
              <button
                key={t.team}
                onClick={() => select(t)}
                onMouseEnter={() => setHighlighted(i)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition ${
                  i === highlighted ? "bg-foreground/5" : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                    {t.seed}
                  </span>
                  <span className="text-foreground">{t.team}</span>
                </span>
                <span className="font-mono text-[9px] uppercase tracking-normal text-muted-foreground">
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
