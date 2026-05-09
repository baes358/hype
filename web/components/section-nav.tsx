"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { TeamSearch } from "@/components/team-search";
import { Team } from "@/lib/data";

const VIEWS = [
  { href: "/", label: "01 / Diverging" },
  { href: "/scatter", label: "02 / Scatter" },
  { href: "/timeline", label: "03 / Timeline" },
  { href: "/bracket", label: "04 / Bracket" },
];

type Props = {
  teams: Team[];
  onSelectTeam: (team: Team) => void;
};

export function SectionNav({ teams, onSelectTeam }: Props) {
  const pathname = usePathname();
  return (
    <nav className="border-b border-border">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 sm:px-6">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex items-center gap-6 whitespace-nowrap">
            {VIEWS.map((v) => {
              const active = pathname === v.href;
              return (
                <Link
                  key={v.href}
                  href={v.href}
                  className={`relative py-3 font-mono text-[10px] uppercase tracking-normal transition ${
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v.label}
                  {active && (
                    <span className="absolute inset-x-0 -bottom-px h-px bg-brand" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="shrink-0 py-2">
          <TeamSearch teams={teams} onSelect={onSelectTeam} />
        </div>
      </div>
    </nav>
  );
}
