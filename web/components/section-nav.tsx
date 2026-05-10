"use client";

import { useRef } from "react";
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
  const navRef = useRef<HTMLElement>(null);

  // Only scroll past the hero if the user is currently above the nav (i.e.,
  // still at the hero). If they've already scrolled to the content, leave
  // them where they are — preserves position when switching tabs mid-read,
  // which is the common case on mobile.
  const handleTabClick = () => {
    if (!navRef.current) return;
    const navTop = navRef.current.getBoundingClientRect().top;
    if (navTop > 0) {
      navRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav ref={navRef} className="border-b border-border">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <div className="flex items-center gap-6 whitespace-nowrap">
              {VIEWS.map((v) => {
                const active = pathname === v.href;
                return (
                  <Link
                    key={v.href}
                    href={v.href}
                    scroll={false}
                    onClick={handleTabClick}
                    className={`relative py-3 font-mono text-sm uppercase tracking-normal transition ${
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
          <div className="shrink-0 pb-3 sm:py-2 sm:pb-0">
            <TeamSearch teams={teams} onSelect={onSelectTeam} />
          </div>
        </div>
      </div>
    </nav>
  );
}
