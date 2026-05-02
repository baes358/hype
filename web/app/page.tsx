import { AppShell } from "@/components/app-shell";
import { dataset } from "@/lib/data";

export default function Home() {
  return <AppShell view="gap" data={dataset} />;
}
