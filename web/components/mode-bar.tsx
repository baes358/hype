"use client";

import { useEffect, useRef } from "react";

import { GapMode } from "@/lib/data";

type Props = {
  mode: GapMode;
  setMode: (m: GapMode) => void;
};

// Tournament / Season mode toggle. Sits structurally ABOVE the filter
// toolbar — mode is a higher-level view setting than filters (and persists
// across navigation in <AppShell>, where filters reset per-route).
//
// Stickiness is layered: this bar sticks at the top-nav offset, and the
// filter toolbar stacks just below by reading the `--hyp3-mode-h` CSS var
// this component publishes.
export function ModeBar({ mode, setMode }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const write = () => {
      document.documentElement.style.setProperty(
        "--hyp3-mode-h",
        `${el.offsetHeight}px`,
      );
    };
    write();
    const ro = new ResizeObserver(write);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--hyp3-mode-h");
    };
  }, []);

  return (
    <div
      ref={ref}
      className="sticky top-[var(--hyp3-nav-h,0px)] z-30 border-b border-border bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-2 sm:px-6">
        <span className="text-xs uppercase tracking-[0.16em] text-graphite-soft">
          mode
        </span>
        <div className="flex items-center rounded-full border border-rule bg-white/60 p-0.5">
          <ModeBtn active={mode === "tournament"} onClick={() => setMode("tournament")} accent="crimson">
            Tournament
          </ModeBtn>
          <ModeBtn active={mode === "season"} onClick={() => setMode("season")} accent="dusty">
            Season
          </ModeBtn>
        </div>
      </div>
    </div>
  );
}

function ModeBtn({
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
      className={`rounded-full px-3 py-1 text-sm uppercase tracking-[0.14em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 ${
        active ? `${accentBg} ${accentText} font-semibold` : "text-graphite-soft hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
