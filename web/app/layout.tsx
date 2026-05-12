import type { Metadata } from "next";
import { Host_Grotesk } from "next/font/google";
import "./globals.css";
import { IntroLoader } from "@/components/intro-loader";

const hostGrotesk = Host_Grotesk({
  variable: "--font-host",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HYP3 — The 2026 NCAA Tournament Hype Gap",
  description:
    "Measuring the gap between internet hype and tournament performance for the 2026 NCAA Men's Basketball Tournament.",
};

// Runs before React hydrates. Adds a class to <html> when the session has
// already seen the intro loader, so CSS can hide the SSR'd overlay before
// the first paint. Without this, repeat visits in the same session would
// flash the loader for the duration of one hydration cycle.
const SESSION_LOADER_GUARD = `try { if (sessionStorage.getItem('hyp3.loader_shown')) document.documentElement.classList.add('hyp3-loader-hidden'); } catch (e) {}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${hostGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SESSION_LOADER_GUARD }} />
      </head>
      <body className="min-h-full flex flex-col overflow-x-hidden bg-background text-foreground font-sans font-medium selection:bg-brand/30">
        <IntroLoader />
        {children}
      </body>
    </html>
  );
}
