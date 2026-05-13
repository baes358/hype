import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { dataset } from "@/lib/data";

export const metadata: Metadata = {
  title: "Divergent — HYP3",
  description:
    "Every team in the 2026 NCAA tournament, ranked by the gap between hype and performance.",
};

export default function DivergentPage() {
  return <AppShell view="gap" data={dataset} />;
}
