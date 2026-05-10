"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Dataset } from "@/lib/data";

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

// -----------------------------------------------------------------------------
// TopNav — sticky editorial nav with hover panels, scroll compression, search.
// -----------------------------------------------------------------------------

type Props = {
  dataset: Dataset;
};

export function TopNav({ dataset }: Props) {
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

  return (
    <header
      className="sticky top-0 z-40 border-b border-rule/40 bg-white/90 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.08)] backdrop-blur supports-[backdrop-filter]:bg-white/75"
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
            className="hidden overflow-hidden whitespace-nowrap text-[10px] uppercase tracking-[0.14em] text-graphite-soft sm:inline"
          >
            <span className="font-mono">D1</span> mens basketball
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

        <div className="ml-auto" />
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
                  className={`relative whitespace-nowrap text-[11px] uppercase tracking-[0.12em] ${
                    active ? "text-ink" : "text-graphite-soft"
                  }`}
                >
                  <span className="mr-1.5 font-mono text-graphite-soft">{item.marker}</span>
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
            className="absolute inset-x-0 top-full hidden border-b border-rule/40 bg-white/95 shadow-[0_8px_20px_-12px_rgba(0,0,0,0.1)] backdrop-blur md:block"
            onMouseEnter={() => setHoveredHref(hovered.href)}
          >
            <div className="mx-auto max-w-7xl px-5 py-6 sm:px-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto]">
                <div className="max-w-2xl">
                  <div className="flex items-baseline gap-3">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-graphite-soft">
                      <span className="font-mono">{hovered.marker}</span> /
                    </span>
                    <span className="text-[11px] uppercase tracking-[0.12em] text-graphite">
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
                      <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-graphite-soft">
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

