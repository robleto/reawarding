import type { Metadata } from 'next';
import LandingFrame from '@/components/landing/LandingFrame';
import ReadinessMock from '@/components/landing/ReadinessMock';

// Landing variant A — "The Wedge". See docs/validation/landing-page-test.md.
//
// Leads on completion/tracking, the framing Step 3a's search research supports.
// The brand name appears nowhere above the fold on purpose: nobody searches for
// it, and putting it in the headline would test the name instead of the promise.

export const metadata: Metadata = {
  title: 'Know where you stand before Oscar night',
  description:
    'Every category, every nominee, counted for you — with the ceremony clock running.',
  // Test pages must not be indexed: they would compete with the app in search
  // and outlive the experiment in Google's cache.
  robots: { index: false, follow: false },
};

export default function OscarTrackerLandingPage() {
  return (
    <LandingFrame
      variant="A"
      topLabel="For people who run the death race"
      headline={
        <>
          You&apos;ve seen 34 of 57.
          <br />
          You just don&apos;t know it.
        </>
      }
      deck={
        <>
          <p>
            Every January you rebuild the same spreadsheet. Every March it falls apart
            somewhere around the Documentary Shorts.
          </p>
          <p>
            This is the version that already knows where you stand — every category, every
            nominee, counted for you, with the ceremony clock running.
          </p>
        </>
      }
      cta="Get it when nominations drop"
      mock={<ReadinessMock />}
      blocks={[
        {
          title: 'Every category, sorted by what you’re missing.',
          body: 'Incomplete categories float to the top. Shorts and Documentary don’t get quietly dropped because they’re at the bottom of a spreadsheet.',
        },
        {
          title: 'A countdown that means something.',
          body: 'Days to the ceremony next to films left to watch. The two numbers that actually decide your February.',
        },
        {
          title: 'Your list, not a leaderboard.',
          body: 'No badges, no trophies, no streaks. A list, a count, and a date.',
        },
      ]}
    />
  );
}
