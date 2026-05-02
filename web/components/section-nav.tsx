"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const VIEWS = [
  { href: "/", label: "01 / Diverging" },
  { href: "/bracket", label: "02 / Bracket" },
];

export function SectionNav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-border">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6">
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
    </nav>
  );
}
