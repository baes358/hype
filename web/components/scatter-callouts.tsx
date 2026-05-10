"use client";

import { StaggerGroup } from "@/components/motion";
import { TAG_STYLE, Team } from "@/lib/data";

type Props = {
  teams: Team[];
  onSelect: (team: Team) => void;
};

function CalloutSection({
  title,
  items,
  onSelect,
}: {
  title: string;
  items: Team[];
  onSelect: (team: Team) => void;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-normal text-muted-foreground">
        {title}
      </div>
      <StaggerGroup staggerMs={50} delay={0.1} className="mt-3 space-y-1">
        {items.map((t, i) => (
          <div key={t.team}>
            <button
              type="button"
              onClick={() => onSelect(t)}
              className="-mx-1 flex w-full items-center gap-2 rounded px-1 py-1 text-left transition-colors hover:bg-muted/50"
            >
              <span
                aria-hidden="true"
                className={`inline-block size-2 shrink-0 rounded-full ${TAG_STYLE[t.story_tag].dot}`}
              />
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="truncate text-sm text-foreground">
                {t.team}
              </span>
            </button>
          </div>
        ))}
      </StaggerGroup>
    </div>
  );
}

export function ScatterCallouts({ teams, onSelect }: Props) {
  if (teams.length === 0) return null;
  const sortedByGap = [...teams].sort((a, b) => a.gap - b.gap);
  const top5Over = sortedByGap.slice(0, 5);
  const top5Under = sortedByGap.slice(-5).reverse();

  return (
    <aside className="grid grid-cols-2 gap-x-6 gap-y-6 md:flex md:w-60 md:shrink-0 md:flex-col md:gap-y-8">
      <CalloutSection title="Most overhyped" items={top5Over} onSelect={onSelect} />
      <CalloutSection title="Most underhyped" items={top5Under} onSelect={onSelect} />
    </aside>
  );
}
