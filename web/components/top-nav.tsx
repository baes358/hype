"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Dataset } from "@/lib/data";

// Module-scope flag set by a nav click and consumed by the freshly-mounted
// TopNav on the destination route. Each route renders its own <AppShell>,
// so TopNav remounts on every cross-route navigation — refs and state
// don't survive. A module variable does.
let pendingScrollOnNav = false;

function scrollToContent() {
  document
    .getElementById("hyp3-content")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

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
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Publish the rendered nav height as a CSS variable so other sticky
  // elements (the filter toolbar) can offset themselves below it instead of
  // sitting under the higher-z-index nav. ResizeObserver picks up both
  // viewport-driven layout shifts and the motion.div padding animation.
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

  const hovered = hoveredHref ? NAV_ITEMS.find((n) => n.href === hoveredHref) : null;

  // Always land on the data viz when a tab is clicked (mobile + desktop).
  // Same-route clicks scroll immediately. Cross-route clicks defer scroll
  // until after the new page mounts — a synchronous smooth scroll gets
  // cancelled when the route tears the DOM down. Each route renders its
  // own <AppShell>, so the pending flag lives at module scope, not in a
  // ref/state that would reset on remount.
  const handleTabClick = (href: string) => {
    if (href === pathname) {
      scrollToContent();
    } else {
      pendingScrollOnNav = true;
    }
  };
  useEffect(() => {
    if (!pendingScrollOnNav) return;
    pendingScrollOnNav = false;
    // Defer past layout commit so the new content has positioned before we
    // measure. A 0ms timer is enough — setTimeout's macrotask runs after
    // the current commit pass. No cleanup: the scroll is a fire-and-forget
    // intent, and a stray timer firing after unmount is a no-op (the
    // element lookup just returns null).
    setTimeout(scrollToContent, 0);
  }, [pathname]);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-rule bg-white/90 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.08)] backdrop-blur supports-[backdrop-filter]:bg-white/75"
      onMouseLeave={() => setHoveredHref(null)}
    >
      <motion.div
        animate={{ paddingTop: isScrolled ? 8 : 14, paddingBottom: isScrolled ? 8 : 14 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="mx-auto flex max-w-7xl items-center gap-4 px-5 sm:px-6"
      >
        {/* LEFT — wordmark + tournament metadata */}
        <Link href="/" className="group flex shrink-0 items-end gap-3" aria-label="HYP3 home">
          <Image
            src="/media/hype-logo.png"
            alt="HYP3"
            width={430}
            height={112}
            priority
            className="h-6 w-auto transition-opacity group-hover:opacity-80 sm:h-7"
          />
          <motion.span
            animate={{ opacity: isScrolled ? 0 : 1, width: isScrolled ? 0 : "auto" }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden whitespace-nowrap text-sm uppercase tracking-[0.14em] text-graphite-soft"
          >
            D1 mens basketball
          </motion.span>
        </Link>

        {/* CENTER — primary nav */}
        <nav className="hidden flex-1 items-center justify-center gap-1 min-[900px]:flex" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <PrimaryNavLink
                key={item.href}
                item={item}
                active={active}
                onHover={(open) => setHoveredHref(open ? item.href : null)}
                onClick={() => handleTabClick(item.href)}
              />
            );
          })}
        </nav>

        <div className="ml-auto" />
      </motion.div>

      {/* Mobile horizontal nav */}
      <div className="min-[900px]:hidden">
        <div className="overflow-x-auto border-t border-rule">
          <div className="flex min-w-max items-center gap-4 px-5 py-3">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  scroll={false}
                  onClick={() => handleTabClick(item.href)}
                  className={`relative whitespace-nowrap text-[11px] uppercase tracking-[0.12em] ${
                    active ? "text-ink" : "text-graphite-soft"
                  }`}
                >
                  <span className={`text-graphite-soft ${active ? "mr-1.5" : ""}`}>{item.marker}</span>
                  {active && (
                    <span className="font-display text-sm tracking-[0.06em]">{item.label}</span>
                  )}
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
            className="absolute inset-x-0 top-full hidden border-b border-rule bg-white/95 shadow-[0_8px_20px_-12px_rgba(0,0,0,0.1)] backdrop-blur min-[900px]:block"
            onMouseEnter={() => setHoveredHref(hovered.href)}
          >
            <div className="mx-auto max-w-7xl px-5 py-6 sm:px-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto]">
                <div className="max-w-2xl">
                  <div className="flex items-baseline gap-3">
                    <span className="text-sm uppercase tracking-[0.14em] text-graphite-soft">
                      <span>{hovered.marker}</span> /
                    </span>
                    <span className="font-display text-sm uppercase tracking-[0.06em] text-graphite">
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
                      <div className="mt-1 text-sm uppercase tracking-[0.12em] text-graphite-soft">
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
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onHover: (open: boolean) => void;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      scroll={false}
      onClick={onClick}
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
        <span className="text-[10px] uppercase tracking-[0.14em] text-graphite-soft">
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

