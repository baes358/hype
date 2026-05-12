"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { TeamSearch } from "@/components/team-search";
import { Dataset, Team } from "@/lib/data";

// Module-scope flag flipped by a nav click; the freshly-mounted TopNav on
// the destination route consumes it. Each route renders its own AppShell, so
// component state would reset — a module variable survives.
let pendingScrollOnNav = false;

function scrollToContent() {
  document
    .getElementById("hyp3-content")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

type NavItem = {
  href: string;
  marker: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/",         marker: "01", label: "Divergent" },
  { href: "/scatter",  marker: "02", label: "Scatter"   },
  { href: "/timeline", marker: "03", label: "Timeline"  },
  { href: "/bracket",  marker: "04", label: "Bracket"   },
];

type Props = {
  dataset: Dataset;
  onSelectTeam: (team: Team) => void;
};

export function TopNav({ dataset, onSelectTeam }: Props) {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);

  // Publish nav height as a CSS var so the filter toolbar can stack below it.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const write = () => {
      document.documentElement.style.setProperty(
        "--hyp3-nav-h",
        `${el.offsetHeight}px`
      );
    };
    write();
    const ro = new ResizeObserver(write);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleTabClick = (href: string) => {
    if (href === pathname) scrollToContent();
    else pendingScrollOnNav = true;
  };
  useEffect(() => {
    if (!pendingScrollOnNav) return;
    pendingScrollOnNav = false;
    setTimeout(scrollToContent, 0);
  }, [pathname]);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-border bg-[rgba(10,10,12,0.78)] backdrop-blur-md backdrop-saturate-[140%]"
    >
      <div className="mx-auto grid max-w-[1440px] grid-cols-[auto_1fr_auto] items-center gap-6 px-5 py-3 sm:px-7 sm:py-3.5">
        {/* LEFT — wordmark + sub */}
        <Link
          href="/"
          aria-label="HYP3 home"
          className="flex shrink-0 items-center gap-3"
        >
          <Image
            src="/media/hype-logo.png"
            alt="HYP3"
            width={430}
            height={112}
            priority
            className="h-7 w-auto"
          />
        </Link>

        {/* CENTER — 4 numbered tab pills */}
        <nav
          aria-label="Primary"
          className="hidden items-center justify-center min-[900px]:flex"
        >
          <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-[rgba(255,255,255,0.025)] p-1">
            {NAV_ITEMS.map((item) => (
              <NavPill
                key={item.href}
                item={item}
                active={pathname === item.href}
                onClick={() => handleTabClick(item.href)}
              />
            ))}
          </div>
        </nav>

        {/* RIGHT — search + docs */}
        <div className="hidden items-center gap-3 min-[900px]:flex">
          <div className="hidden lg:block">
            <TeamSearch teams={dataset.teams} onSelect={onSelectTeam} />
          </div>
          <a
            href="https://github.com/sophbae99/hype"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-1 transition-colors hover:text-ink"
          >
            Docs ↗
          </a>
          <a
            href="https://github.com/sophbae99/hype"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-1 transition-colors hover:text-ink"
          >
            API ↗
          </a>
        </div>
      </div>

      {/* Mobile horizontal nav */}
      <div className="min-[900px]:hidden">
        <div className="overflow-x-auto border-t border-border">
          <div className="flex min-w-max items-center gap-2 px-5 py-2">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  scroll={false}
                  onClick={() => handleTabClick(item.href)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] ${
                    active
                      ? "bg-[rgba(18,119,222,0.16)] text-core-bright shadow-[inset_0_0_0_1px_rgba(114,184,255,0.4)]"
                      : "text-ink-1"
                  }`}
                >
                  <span className={active ? "text-core-bright" : "text-ink-3"}>
                    {item.marker}
                  </span>
                  <span className="font-display tracking-[0.08em]">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}

function NavPill({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      scroll={false}
      onClick={onClick}
      className={`relative inline-flex items-center gap-2.5 rounded-lg px-4 py-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-core-bright/60 ${
        active
          ? "bg-[rgba(18,119,222,0.16)] text-core-bright shadow-[inset_0_0_0_1px_rgba(114,184,255,0.4),0_0_28px_-8px_rgba(114,184,255,0.55)]"
          : "text-ink-1 hover:bg-[rgba(255,255,255,0.04)] hover:text-ink"
      }`}
    >
      <span
        className={`font-mono text-[10px] font-semibold tracking-[0.14em] ${
          active ? "text-core-bright" : "text-ink-3"
        }`}
      >
        {item.marker}
      </span>
      <span className="font-display text-[12px] font-bold uppercase leading-none tracking-[0.08em] lg:text-[13px]">
        {item.label}
      </span>
    </Link>
  );
}
