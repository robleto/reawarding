import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import ExpandableYearCard from "../components/home/ExpandableYearCard";
import type { Movie } from "../types/types";
import type { UserAward } from "../hooks/useUserAwards";

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeMovie = (
  overrides: Partial<Movie> & { id: number; title: string; release_year: number }
): Movie => ({
  poster_url: "",
  thumb_url: "",
  created_at: "2024-01-01T00:00:00Z",
  rankings: [],
  ...overrides,
});

// ── 2023 mock data (year with Academy winner "Oppenheimer") ─────────────────

const oppenheimer = makeMovie({
  id: 101,
  title: "Oppenheimer",
  release_year: 2023,
  cached_poster_url:
    "https://image.tmdb.org/t/p/w342/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
  imdb_rating: 8.3,
  tmdb_rating: 8.1,
  rankings: [{ seen_it: true, ranking: 9, user_id: "user-1" }],
});

const movies2023: Movie[] = [
  oppenheimer,
  makeMovie({
    id: 102,
    title: "Barbie",
    release_year: 2023,
    cached_poster_url:
      "https://image.tmdb.org/t/p/w342/iuFNMS8vlbN1B7BFJyVGSFSAfwa.jpg",
    imdb_rating: 7.0,
    tmdb_rating: 7.2,
    rankings: [],
  }),
  makeMovie({
    id: 103,
    title: "Poor Things",
    release_year: 2023,
    cached_poster_url:
      "https://image.tmdb.org/t/p/w342/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg",
    imdb_rating: 7.8,
    tmdb_rating: 7.6,
    rankings: [],
  }),
  makeMovie({
    id: 104,
    title: "The Holdovers",
    release_year: 2023,
    cached_poster_url:
      "https://image.tmdb.org/t/p/w342/VHmqX4HrGsZxKL4bLhwBPMIyY1.jpg",
    imdb_rating: 7.9,
    tmdb_rating: 7.8,
    rankings: [],
  }),
  makeMovie({
    id: 105,
    title: "Past Lives",
    release_year: 2023,
    cached_poster_url: "",
    imdb_rating: 7.8,
    tmdb_rating: 7.7,
    rankings: [],
  }),
  makeMovie({
    id: 106,
    title: "Killers of the Flower Moon",
    release_year: 2023,
    cached_poster_url:
      "https://image.tmdb.org/t/p/w342/dB6Krk806zeqd0YoiGHOCFaOthz.jpg",
    imdb_rating: 7.6,
    tmdb_rating: 7.5,
    rankings: [],
  }),
];

const awards2023WithNominees: UserAward[] = [
  {
    year: 2023,
    category: "best-picture",
    winnerId: 101,
    nomineeIds: [101, 102, 103, 104, 105],
  },
];

const awards2023Complete: UserAward[] = [
  {
    year: 2023,
    category: "best-picture",
    winnerId: 101,
    nomineeIds: [101, 102, 103, 104, 105, 106, 107, 108, 109, 110],
  },
];

// ── 2022 mock data (year without an Academy entry in our static map) ─────────

const banshees = makeMovie({
  id: 201,
  title: "The Banshees of Inisherin",
  release_year: 2022,
  cached_poster_url:
    "https://image.tmdb.org/t/p/w342/4yFG6cSPaCaPhyJ1vtGOiMV7hDr.jpg",
  imdb_rating: 7.7,
  tmdb_rating: 7.5,
  rankings: [{ seen_it: true, ranking: 8, user_id: "user-1" }],
});

const movies2022NoLeader: Movie[] = [
  makeMovie({
    id: 202,
    title: "Everything Everywhere All at Once",
    release_year: 2022,
    cached_poster_url:
      "https://image.tmdb.org/t/p/w342/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg",
    imdb_rating: 7.8,
    rankings: [],
  }),
  makeMovie({
    id: 203,
    title: "Tár",
    release_year: 2022,
    cached_poster_url: "",
    imdb_rating: 7.5,
    rankings: [],
  }),
];

// ── Shared callback stubs ────────────────────────────────────────────────────

const sharedArgs = {
  currentUserId: "user-1",
  onToggle: fn(),
  onUpdateMovieRanking: fn(),
  onCreateAward: fn(),
  onOpenFullExplorer: fn(),
  onMilestoneReached: fn(),
};

// ── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof ExpandableYearCard> = {
  title: "Home/ExpandableYearCard",
  component: ExpandableYearCard,
  parameters: {
    layout: "padded",
    backgrounds: {
      default: "dark",
      values: [{ name: "dark", value: "#0f1117" }],
    },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ExpandableYearCard>;

// ── Stories ──────────────────────────────────────────────────────────────────

/** Default collapsed state — shows poster, year, leading film title, progress bar. */
export const Collapsed: Story = {
  args: {
    ...sharedArgs,
    year: 2023,
    leader: oppenheimer,
    nomineeCount: 5,
    neededForBallot: 5,
    allMovies: movies2023,
    awards: awards2023WithNominees,
    isExpanded: false,
  },
};

/** Expanded state — reveals the horizontal film rail for unrated movies. */
export const Expanded: Story = {
  args: {
    ...sharedArgs,
    year: 2023,
    leader: oppenheimer,
    nomineeCount: 5,
    neededForBallot: 5,
    allMovies: movies2023,
    awards: awards2023WithNominees,
    isExpanded: true,
  },
};

/**
 * Year where the user has no nominees yet. The leader prop is still required
 * (it is the highest-rated seen film or a placeholder passed by the parent),
 * but the progress indicator shows 0/10 and the "Start rating" label appears.
 */
export const NoLeader: Story = {
  args: {
    ...sharedArgs,
    year: 2022,
    leader: banshees,
    nomineeCount: 0,
    neededForBallot: 10,
    allMovies: movies2022NoLeader,
    awards: [],
    isExpanded: false,
  },
};
