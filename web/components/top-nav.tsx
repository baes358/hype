"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Dataset, GapMode } from "@/lib/data";

// -----------------------------------------------------------------------------
// Nav config — primary route links + editorial metadata for hover panels.
// -----------------------------------------------------------------------------

type NavItem = {
  href: string;
  label: string;
  marker: string;
  description: string;
  preview: { stat: string; caption: string }[];
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "The Gap",
    marker: "01",
    description:
      "Every team plotted by the wrongness of the internet's read — overhyped flame-outs on the left, underhyped sleepers on the right.",
    preview: [
      { stat: "−35", caption: "biggest overhype" },
      { stat: "+49", caption: "biggest underhype" },
      { stat: "68", caption: "teams ranked" },
    ],
  },
  {
    href: "/scatter",
    label: "Scatter",
    marker: "02",
    description:
      "Hype on one axis, wins on the other. Outliers are the story: bottom-right is overhyped, top-left is overlooked.",
    preview: [
      { stat: "x", caption: "tournament wins" },
      { stat: "y", caption: "hype index" },
    ],
  },
  {
    href: "/timeline",
    label: "Timeline",
    marker: "03",
    description:
      "Daily hype curves over the 15-day window, rows ordered by gap. Reveals when each story actually broke.",
    preview: [
      { stat: "15", caption: "days" },
      { stat: "68", caption: "rows" },
    ],
  },
  {
    href: "/bracket",
    label: "Bracket",
    marker: "04",
    description:
      "Four regions, sorted by seed, colored by the story each team ended up telling.",
    preview: [
      { stat: "4", caption: "regions" },
      { stat: "16", caption: "seeds each" },
    ],
  },
];

const AVAILABLE_YEARS = [2025, 2026] as const;

// -----------------------------------------------------------------------------
// TopNav — sticky editorial nav with hover panels, scroll compression, search.
// -----------------------------------------------------------------------------

type Props = {
  dataset: Dataset;
  gapMode: GapMode;
  setGapMode: (m: GapMode) => void;
};

export function TopNav({ dataset, gapMode, setGapMode }: Props) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hovered = hoveredHref ? NAV_ITEMS.find((n) => n.href === hoveredHref) : null;
  const dataPulledLabel = formatPulledShort(dataset.metadata.data_pulled_at);

  return (
    <header
      className="sticky top-0 z-40 border-b border-rule/70 bg-paper/85 backdrop-blur supports-[backdrop-filter]:bg-paper/70"
      onMouseLeave={() => setHoveredHref(null)}
    >
      <motion.div
        animate={{ paddingTop: isScrolled ? 8 : 14, paddingBottom: isScrolled ? 8 : 14 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="mx-auto flex max-w-7xl items-center gap-4 px-5 sm:px-6"
      >
        {/* LEFT — wordmark + tournament metadata */}
        <Link href="/" className="group flex shrink-0 items-baseline gap-3" aria-label="HYP3 home">
          <span className="font-display text-2xl font-bold leading-none tracking-tight text-ink transition-colors group-hover:text-graphite sm:text-[28px]">
            HYP3
          </span>
          <motion.span
            animate={{ opacity: isScrolled ? 0 : 1, width: isScrolled ? 0 : "auto" }}
            transition={{ duration: 0.18 }}
            className="hidden overflow-hidden whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.14em] text-graphite-soft sm:inline"
          >
            {dataset.metadata.tournament_year} NCAA Tournament
          </motion.span>
        </Link>

        {/* CENTER — primary nav */}
        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <PrimaryNavLink
                key={item.href}
                item={item}
                active={active}
                onHover={(open) => setHoveredHref(open ? item.href : null)}
              />
            );
          })}
        </nav>

        {/* RIGHT — utility cluster */}
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <ModePill mode={gapMode} setMode={setGapMode} />
          <YearSelector currentYear={dataset.metadata.tournament_year} />
          <DataStatus label={dataPulledLabel} />
        </div>
      </motion.div>

      {/* Mobile horizontal nav */}
      <div className="md:hidden">
        <div className="overflow-x-auto border-t border-rule/50">
          <div className="flex min-w-max items-center gap-4 px-5 py-2">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  scroll={false}
                  className={`relative whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.12em] ${
                    active ? "text-ink" : "text-graphite-soft"
                  }`}
                >
                  <span className="mr-1.5 text-graphite-soft">{item.marker}</span>
                  {item.label}
                  {active && <span className="absolute inset-x-0 -bottom-1 h-[2px] bg-ink" />}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hover panel — appears below nav when a link is hovered */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            key={hovered.href}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute inset-x-0 top-full hidden border-b border-rule/70 bg-paper-deep/95 backdrop-blur md:block"
            onMouseEnter={() => setHoveredHref(hovered.href)}
          >
            <div className="mx-auto max-w-7xl px-5 py-6 sm:px-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto]">
                <div className="max-w-2xl">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-graphite-soft">
                      {hovered.marker} /
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-graphite">
                      {hovered.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-graphite">
                    {hovered.description}
                  </p>
                </div>
                <div className="flex items-end gap-6">
                  {hovered.preview.map((p) => (
                    <div key={p.caption} className="text-right">
                      <div className="font-display text-2xl leading-none tracking-tight text-ink">
                        {p.stat}
                      </div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-graphite-soft">
                        {p.caption}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </header>
  );
}

// -----------------------------------------------------------------------------
// PrimaryNavLink — center nav link with hover lift, animated underline, accent.
// -----------------------------------------------------------------------------

function PrimaryNavLink({
  item,
  active,
  onHover,
}: {
  item: NavItem;
  active: boolean;
  onHover: (open: boolean) => void;
}) {
  return (
    <Link
      href={item.href}
      scroll={false}
      onMouseEnter={() => onHover(true)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      className={`group relative px-2 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper lg:px-3 ${
        active ? "text-ink" : "text-graphite hover:text-ink"
      }`}
    >
      <motion.span
        whileHover={{ x: 2 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="flex items-baseline gap-2 whitespace-nowrap"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-graphite-soft">
          {item.marker}
        </span>
        <span
          className={`font-display text-[14px] uppercase tracking-[0.06em] lg:text-[15px] ${
            active ? "font-semibold" : "font-medium"
          }`}
        >
          {item.label}
        </span>
      </motion.span>
      {/* Active underline */}
      {active && (
        <span className="absolute inset-x-2 -bottom-[1px] h-[2px] bg-ink lg:inset-x-3" />
      )}
      {/* Hover underline (anim-in) */}
      {!active && (
        <span className="absolute inset-x-2 -bottom-[1px] h-[1px] origin-left scale-x-0 bg-ink/60 transition-transform duration-200 group-hover:scale-x-100 lg:inset-x-3" />
      )}
    </Link>
  );
}

// -----------------------------------------------------------------------------
// ModePill — tournament / season segmented toggle
// -----------------------------------------------------------------------------

function ModePill({ mode, setMode }: { mode: GapMode; setMode: (m: GapMode) => void }) {
  return (
    <div className="hidden items-center rounded-full border border-rule bg-paper/60 p-0.5 sm:flex">
      <ModePillBtn active={mode === "tournament"} onClick={() => setMode("tournament")} accent="crimson">
        Tournament
      </ModePillBtn>
      <ModePillBtn active={mode === "season"} onClick={() => setMode("season")} accent="dusty">
        Season
      </ModePillBtn>
    </div>
  );
}

function ModePillBtn({
  active,
  onClick,
  accent,
  children,
}: {
  active: boolean;
  onClick: () => void;
  accent: "crimson" | "dusty";
  children: React.ReactNode;
}) {
  const accentBg = accent === "crimson" ? "bg-crimson/12" : "bg-dusty/12";
  const accentText = accent === "crimson" ? "text-crimson" : "text-dusty";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 ${
        active ? `${accentBg} ${accentText} font-semibold` : "text-graphite-soft hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

// -----------------------------------------------------------------------------
// YearSelector — dropdown that pushes ?year= and lets YearSwapper take over.
// -----------------------------------------------------------------------------

function YearSelector({ currentYear }: { currentYear: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const pick = (year: number) => {
    setOpen(false);
    if (year === currentYear) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(year));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-rule px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-graphite transition-colors hover:border-ink hover:bg-paper-deep hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-graphite-soft">YR</span>
        <span className="font-semibold text-ink">{currentYear}</span>
        <svg width="8" height="6" viewBox="0 0 8 6" aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M1 1l3 4 3-4" stroke="currentColor" fill="none" strokeWidth="1.2" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            role="listbox"
            className="absolute right-0 z-10 mt-2 min-w-[120px] overflow-hidden rounded-md border border-rule bg-paper shadow-lg shadow-ink/[0.04]"
          >
            {AVAILABLE_YEARS.map((y) => (
              <li key={y}>
                <button
                  type="button"
                  role="option"
                  aria-selected={y === currentYear}
                  onClick={() => pick(y)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left font-mono text-[11px] uppercase tracking-[0.12em] transition-colors hover:bg-paper-deep ${
                    y === currentYear ? "text-ink font-semibold" : "text-graphite"
                  }`}
                >
                  <span>{y}</span>
                  {y === currentYear && <span className="size-1 rounded-full bg-ink" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

// -----------------------------------------------------------------------------
// DataStatus — small "PULLED · MAY 10" indicator
// -----------------------------------------------------------------------------

function DataStatus({ label }: { label: string }) {
  return (
    <div className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-graphite-soft xl:flex">
      <span className="relative inline-flex h-1.5 w-1.5">
        <span className="absolute inset-0 rounded-full bg-gold/70" />
        <span className="absolute inset-0 animate-ping rounded-full bg-gold/40" />
      </span>
      <span>Data · {label}</span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatPulledShort(iso: string): string {
  if (!iso || iso.startsWith("PLACEHOLDER")) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase();
  } catch {
    return "—";
  }
}
