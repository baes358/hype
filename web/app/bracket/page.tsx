import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { dataset } from "@/lib/data";

export const metadata: Metadata = {
  title: "Bracket — HYP3",
  description: "All 68 teams arranged by region and seed, colored by their hype-vs-performance story.",
};

export default function BracketPage() {
  return <AppShell view="bracket" data={dataset} />;
}
