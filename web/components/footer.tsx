import { Dataset } from "@/lib/data";

type Props = { data: Dataset };

export function Footer({ data }: Props) {
  return (
    <footer
      // Flat footer surface — no gradient, just a hairline at the top.
      className="relative z-[1] mt-10 border-t border-border"
      style={{
        padding:
          "clamp(2rem, 5vw, 4rem) clamp(1rem, 3vw, 1.75rem) clamp(1.25rem, 3vw, 1.5rem)",
      }}
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 border-b border-border pb-10">
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
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
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
            <FootLink href="mailto:sophbae99@gmail.com?subject=HYP3%20correction">
              Submit correction ↗
            </FootLink>
            <FootLink href="https://github.com/sophbae99/hype/commits/main" external>
              Changelog ↗
            </FootLink>
          </Column>
        </div>
      </div>
      <div className="mx-auto mt-6 max-w-[1440px] font-mono text-sm uppercase tracking-[0.12em] text-ink-2">
        Sophia Bae © HYP3 {data.metadata.tournament_year} · All rights reserved.
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
