import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { dataset } from "@/lib/data";

export const metadata: Metadata = {
  title: "Timeline, HYP3",
  description:
    "A heatmap of every team's daily hype intensity across the 15-day window, with Selection Sunday marked.",
};

export default function TimelinePage() {
  return <AppShell view="timeline" data={dataset} />;
}
