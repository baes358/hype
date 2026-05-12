import { Dataset } from "@/lib/data";

type Props = { data: Dataset };

export function Footer({ data }: Props) {
  return (
    <footer
      // Feather from transparent (matches body --bg at top) gradually down to
      // a 0.25-alpha black at the very bottom. Previously terminated at 0.5
      // which created a visibly darker rectangle right where the footer began.
      className="relative z-[1] mt-10 border-t border-border bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.12)_40%,rgba(0,0,0,0.25)_100%)]"
      style={{
        padding:
          "clamp(2rem, 5vw, 4rem) clamp(1rem, 3vw, 1.75rem) clamp(1.25rem, 3vw, 1.5rem)",
      }}
    >
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-8 border-b border-border pb-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <span
            className="font-display font-bold leading-none tracking-[0.04em] text-ink"
            style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}
          >
            HYP3
          </span>
          <span className="font-mono text-sm uppercase tracking-[0.12em] text-ink-2">
            Built for the underdogs.
          </span>
        </div>
        <Column label="PRODUCT">
          <FootLink href="/">The Gap</FootLink>
          <FootLink href="/scatter">The Scatter</FootLink>
          <FootLink href="/timeline">The Timeline</FootLink>
          <FootLink href="/bracket">The Bracket</FootLink>
        </Column>
        <Column label="DATA">
          <FootLink href="https://github.com/sophbae99/hype" external>
            Methodology ↗
          </FootLink>
          <FootLink href="https://github.com/sophbae99/hype" external>
            Source on GitHub ↗
          </FootLink>
          <FootLink href="mailto:sophbae99@gmail.com?subject=HYP3%20correction">
            Submit correction ↗
          </FootLink>
          <FootLink href="https://github.com/sophbae99/hype/commits/main" external>
            Changelog ↗
          </FootLink>
        </Column>
        <Column label="COMPANY">
          <FootLink href="https://github.com/sophbae99/hype" external>
            About HYP3
          </FootLink>
          <FootLink href="mailto:sophbae99@gmail.com">Contact</FootLink>
        </Column>
      </div>
      <div className="mx-auto mt-6 flex max-w-[1440px] flex-wrap justify-between gap-3 font-mono text-sm uppercase tracking-[0.12em] text-ink-2">
        <div>
          © {data.metadata.tournament_year} HYP3 · Sophia Bae · All rights reserved.
        </div>
        <div className="flex flex-wrap gap-4">
          <span>v3.1.0</span>
          <span>D1 Men&apos;s Basketball</span>
        </div>
      </div>
    </footer>
  );
}

function Column({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="mb-1 font-mono text-sm uppercase tracking-[0.18em] text-ink-2">
        {label}
      </div>
      {children}
    </div>
  );
}

function FootLink({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      // Min 44px tap target.
      className="inline-flex min-h-11 items-center font-sans text-base leading-snug text-ink-1 transition-colors hover:text-ink"
    >
      {children}
    </a>
  );
}
