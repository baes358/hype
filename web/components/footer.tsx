import { Dataset } from "@/lib/data";

type Props = { data: Dataset };

export function Footer({ data }: Props) {
  return (
    <footer
      className="relative z-[1] mt-10 border-t border-border"
      style={{
        padding:
          "clamp(3rem, 7vw, 5rem) clamp(1.25rem, 4vw, 2.5rem) clamp(2rem, 4vw, 2.5rem)",
      }}
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-14">
        {/* Wordmark + tagline */}
        <div className="flex flex-col gap-4">
          <span
            className="font-display font-black leading-none tracking-[0.02em] text-ink"
            style={{ fontSize: "clamp(2.5rem, 6vw, 3.75rem)" }}
          >
            HYP3
          </span>
          <span className="font-mono text-base uppercase tracking-[0.12em] text-ink-2">
            Built for the underdogs.
          </span>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
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

        {/* Hairline divider above copyright */}
        <div className="border-t border-border pt-10">
          <div className="font-mono text-sm uppercase tracking-[0.12em] leading-[1.7] text-ink-2">
            <div>Sophia Bae © HYP3 {data.metadata.tournament_year}</div>
            <div>All rights reserved.</div>
          </div>
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
    <div className="flex flex-col gap-4">
      <div className="font-mono text-sm uppercase tracking-[0.18em] text-ink-2">
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
      className="inline-flex min-h-11 items-center font-sans text-base leading-snug text-ink-1 transition-colors hover:text-ink"
    >
      {children}
    </a>
  );
}
