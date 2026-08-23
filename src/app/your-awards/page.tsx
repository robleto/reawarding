import type { Metadata } from 'next';
import LandingFrame from '@/components/landing/LandingFrame';
import CompareMock from '@/components/landing/CompareMock';

// Landing variant B — "The Ritual". See docs/validation/landing-page-test.md.
//
// Leads on the personal-awards idea. Step 3a found zero search demand for this
// vocabulary, so this page is the test of whether that finding is real or just
// a vocabulary artifact — behaviour gets to overrule a demand proxy. This is
// the only variant allowed to use the brand name.

export const metadata: Metadata = {
  title: 'Keep your ballot next to theirs',
  description:
    'Your picks and the Academy’s, side by side, every year — so your record outlives the argument.',
  robots: { index: false, follow: false },
};

export default function YourAwardsLandingPage() {
  return (
    <LandingFrame
      variant="B"
      topLabel="Reawarding"
      headline={
        <>
          The Academy got
          <br />
          Best Picture wrong. Again.
        </>
      }
      deck={
        <>
          <p>
            You know what should have won. You&apos;ve argued about it. You&apos;ve never
            written it down anywhere you could go back to.
          </p>
          <p>
            Reawarding keeps your ballot next to theirs — every year, every category — so
            your record outlives the argument.
          </p>
        </>
      }
      cta="Start your ballot"
      mock={<CompareMock />}
      blocks={[
        {
          title: 'They said. You said.',
          body: 'Two columns, one year at a time. Where you agreed, and where you handed it to someone else.',
        },
        {
          title: 'A verdict that keeps.',
          body: 'Your picks stay on the record, ceremony after ceremony, instead of evaporating the day after the show.',
        },
        {
          title: 'Rank what you’ve actually seen.',
          body: 'Your ballot only counts films you’ve watched — so it stays honest.',
        },
      ]}
    />
  );
}
