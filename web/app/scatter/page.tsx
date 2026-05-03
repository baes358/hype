import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { dataset } from "@/lib/data";

export const metadata: Metadata = {
  title: "Scatter — HYP3",
  description:
    "Hype against tournament performance — every team plotted as a single dot, with the diagonal as the expected line.",
};

export default function ScatterPage() {
  return <AppShell view="scatter" data={dataset} />;
}
