import type { ReactNode } from 'react';
import type { LandingVariant } from '@/lib/landingDb';
import SignupFlow from './SignupFlow';

interface Block {
  title: string;
  body: string;
}

interface LandingFrameProps {
  variant: LandingVariant;
  /** Small mono label above the headline. Variant A must not carry the brand. */
  topLabel: string;
  headline: ReactNode;
  deck: ReactNode;
  cta: string;
  mock: ReactNode;
  blocks: [Block, Block, Block];
}

/**
 * Shared shell for both landing variants — see docs/validation/landing-page-test.md.
 *
 * Structure, type scale, CTA placement and the signup flow are identical across
 * variants on purpose: the test has exactly one variable, the promise. Any
 * layout difference between A and B would confound the result.
 *
 * Not built from the app's canonical card components (the reuse mandate in
 * CLAUDE.md), and deliberately so: this is marketing surface outside the app
 * shell, and rendering real app chrome here would mean testing the app instead
 * of the promise.
 */
export default function LandingFrame({
  variant,
  topLabel,
  headline,
  deck,
  cta,
  mock,
  blocks,
}: LandingFrameProps) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />

      <main className="mx-auto w-full max-w-5xl px-6 pb-24 pt-12 sm:pt-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold-500/80">
          {topLabel}
        </p>

        <div className="mt-10 grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-16">
          <div>
            <h1 className="font-unbounded text-[2.1rem] font-bold leading-[1.08] tracking-tight text-gray-50 sm:text-5xl">
              {headline}
            </h1>

            <div className="mt-7 space-y-4 text-[17px] leading-relaxed text-gray-400">{deck}</div>

            <div className="mt-9 max-w-lg">
              <SignupFlow variant={variant} cta={cta} />
            </div>
          </div>

          <div className="lg:pt-2">{mock}</div>
        </div>

        {/* Three claims, hairline-separated. No icon grid — the mock does the
            persuading and a row of stock glyphs would only dilute it. */}
        <section className="mt-24 border-t border-gray-800">
          {blocks.map((block, i) => (
            <div
              key={block.title}
              className="grid gap-3 border-b border-gray-800 py-8 sm:grid-cols-[4rem_1fr] sm:gap-8"
            >
              <p className="font-mono text-sm text-gold-500/70 tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </p>
              <div>
                <h2 className="font-unbounded text-lg font-semibold text-gray-100">
                  {block.title}
                </h2>
                <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-400">
                  {block.body}
                </p>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-20 max-w-lg">
          <SignupFlow variant={variant} cta={cta} />
        </section>

        <footer className="mt-24 border-t border-gray-800 pt-8 text-sm text-gray-600">
          <p>
            Made by one person who got tired of the spreadsheet. Not affiliated with the
            Academy of Motion Picture Arts and Sciences.
          </p>
        </footer>
      </main>
    </div>
  );
}
