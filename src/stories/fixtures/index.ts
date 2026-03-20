import type { UserAward } from "@/hooks/useUserAwards";
import type { FeedRow } from "@/hooks/useRecognitionFeed";
import type { Movie } from "@/types/types";

export const STORY_USER_ID = "story-user";

type MovieOverride = Partial<Movie> & {
  id: number;
  title: string;
  release_year: number;
};

type RankingOverride = Partial<Movie["rankings"][number]>;

export function makeRanking(
  overrides: RankingOverride = {}
): Movie["rankings"][number] {
  return {
    seen_it: true,
    ranking: 8,
    user_id: STORY_USER_ID,
    ...overrides,
  };
}

export function makeMovie(overrides: MovieOverride): Movie {
  const poster =
    overrides.cached_poster_url ??
    overrides.cached_thumb_url ??
    overrides.poster_url ??
    overrides.thumb_url ??
    "";

  return {
    created_at: "2024-01-01T00:00:00Z",
    genres: [],
    rankings: [],
    poster_url: poster,
    thumb_url: poster,
    cached_poster_url: overrides.cached_poster_url ?? poster,
    cached_thumb_url: overrides.cached_thumb_url ?? poster,
    ...overrides,
  };
}

export function withUserRanking(
  movie: Movie,
  ranking: number | null,
  seenIt = ranking !== null
): Movie {
  return {
    ...movie,
    rankings: [makeRanking({ ranking, seen_it: seenIt })],
  };
}

export function makeAward(overrides: Partial<UserAward>): UserAward {
  return {
    year: 2023,
    category: "best-picture",
    winnerId: null,
    nomineeIds: [],
    ...overrides,
  };
}

export function makeFeedRow(overrides: Partial<FeedRow> & Pick<FeedRow, "id" | "label">): FeedRow {
  return {
    id: overrides.id,
    label: overrides.label,
    films: overrides.films ?? [],
  };
}

export interface StoryList {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  updated_at: string;
  movie_count?: number;
  posterUrls?: string[];
}

export function makeList(
  overrides: Partial<StoryList> & Pick<StoryList, "id" | "name">
): StoryList {
  return {
    user_id: STORY_USER_ID,
    description: null,
    is_public: true,
    updated_at: "2026-03-16T10:00:00Z",
    movie_count: 0,
    posterUrls: [],
    ...overrides,
  };
}

export const fixtureMovies = {
  oppenheimer: withUserRanking(
    makeMovie({
      id: 101,
      title: "Oppenheimer",
      release_year: 2023,
      cached_poster_url:
        "https://image.tmdb.org/t/p/w342/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
      imdb_rating: 8.3,
      tmdb_rating: 8.1,
      genres: ["Drama", "History"],
    }),
    9
  ),
  dunePartTwo: makeMovie({
    id: 102,
    title: "Dune: Part Two",
    release_year: 2024,
    cached_poster_url:
      "https://image.tmdb.org/t/p/w342/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
    imdb_rating: 8.5,
    tmdb_rating: 8.3,
    genres: ["Science Fiction", "Adventure"],
  }),
  barbie: makeMovie({
    id: 103,
    title: "Barbie",
    release_year: 2023,
    cached_poster_url:
      "https://image.tmdb.org/t/p/w342/iuFNMS8vlbN1B7BFJyVGSFSAfwa.jpg",
    imdb_rating: 7.0,
    tmdb_rating: 7.2,
    genres: ["Comedy", "Fantasy"],
  }),
  poorThings: makeMovie({
    id: 104,
    title: "Poor Things",
    release_year: 2023,
    cached_poster_url:
      "https://image.tmdb.org/t/p/w342/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg",
    imdb_rating: 7.8,
    tmdb_rating: 7.6,
    genres: ["Drama", "Fantasy"],
  }),
  holdovers: makeMovie({
    id: 105,
    title: "The Holdovers",
    release_year: 2023,
    cached_poster_url:
      "https://image.tmdb.org/t/p/w342/VHmqX4HrGsZxKL4bLhwBPMIyY1.jpg",
    cached_thumb_url:
      "https://image.tmdb.org/t/p/w342/VHmqX4HrGsZxKL4bLhwBPMIyY1.jpg",
    imdb_rating: 7.9,
    tmdb_rating: 7.8,
    genres: ["Comedy", "Drama"],
  }),
  pastLives: makeMovie({
    id: 106,
    title: "Past Lives",
    release_year: 2023,
    imdb_rating: 7.8,
    tmdb_rating: 7.7,
    genres: ["Drama", "Romance"],
  }),
  killersOfTheFlowerMoon: makeMovie({
    id: 107,
    title: "Killers of the Flower Moon",
    release_year: 2023,
    cached_poster_url:
      "https://image.tmdb.org/t/p/w342/dB6Krk806zeqd0YoiGHOCFaOthz.jpg",
    imdb_rating: 7.6,
    tmdb_rating: 7.5,
    genres: ["Crime", "Drama"],
  }),
  americanFiction: makeMovie({
    id: 108,
    title: "American Fiction",
    release_year: 2023,
    imdb_rating: 7.7,
    genres: ["Comedy", "Drama"],
  }),
  eeaao: makeMovie({
    id: 201,
    title: "Everything Everywhere All at Once",
    release_year: 2022,
    cached_poster_url:
      "https://image.tmdb.org/t/p/w342/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg",
    imdb_rating: 7.8,
    genres: ["Science Fiction", "Comedy"],
  }),
  banshees: withUserRanking(
    makeMovie({
      id: 202,
      title: "The Banshees of Inisherin",
      release_year: 2022,
      cached_poster_url:
        "https://image.tmdb.org/t/p/w342/4yFG6cSPaCaPhyJ1vtGOiMV7hDr.jpg",
      imdb_rating: 7.7,
      tmdb_rating: 7.5,
      genres: ["Drama", "Comedy"],
    }),
    8
  ),
  tar: makeMovie({
    id: 203,
    title: "Tár",
    release_year: 2022,
    imdb_rating: 7.5,
    genres: ["Drama", "Music"],
  }),
  coda: makeMovie({
    id: 204,
    title: "CODA",
    release_year: 2021,
    cached_poster_url:
      "https://image.tmdb.org/t/p/w342/BzVjmm8l23rPsijLiNLUzuQtyd.jpg",
    imdb_rating: 7.5,
    genres: ["Drama"],
  }),
  nomadland: makeMovie({
    id: 205,
    title: "Nomadland",
    release_year: 2020,
    cached_poster_url:
      "https://image.tmdb.org/t/p/w342/66qhJD2c9Z7i9vfUkx4EPNZE4B3.jpg",
    imdb_rating: 7.3,
    genres: ["Drama"],
  }),
  parasite: makeMovie({
    id: 206,
    title: "Parasite",
    release_year: 2019,
    cached_poster_url:
      "https://image.tmdb.org/t/p/w342/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    imdb_rating: 8.5,
    genres: ["Thriller", "Drama"],
  }),
};

export const expandableYear2023Movies: Movie[] = [
  fixtureMovies.oppenheimer,
  fixtureMovies.barbie,
  fixtureMovies.poorThings,
  fixtureMovies.holdovers,
  fixtureMovies.pastLives,
  fixtureMovies.killersOfTheFlowerMoon,
];

export const expandableYear2022Movies: Movie[] = [
  fixtureMovies.eeaao,
  fixtureMovies.tar,
];

export const awards2023WithNominees: UserAward[] = [
  makeAward({
    year: 2023,
    winnerId: fixtureMovies.oppenheimer.id,
    nomineeIds: [
      fixtureMovies.oppenheimer.id,
      fixtureMovies.barbie.id,
      fixtureMovies.poorThings.id,
      fixtureMovies.holdovers.id,
      fixtureMovies.pastLives.id,
    ],
  }),
];

export const recognitionRows: FeedRow[] = [
  makeFeedRow({
    id: "winners",
    label: "Best Picture winners",
    films: [
      fixtureMovies.oppenheimer,
      fixtureMovies.eeaao,
      fixtureMovies.coda,
      fixtureMovies.nomadland,
      fixtureMovies.parasite,
    ],
  }),
  makeFeedRow({
    id: "acclaimed",
    label: "Acclaimed & unrated",
    films: [
      fixtureMovies.holdovers,
      fixtureMovies.pastLives,
      fixtureMovies.killersOfTheFlowerMoon,
      fixtureMovies.poorThings,
      fixtureMovies.americanFiction,
    ],
  }),
];

export const storyLists: StoryList[] = [
  makeList({
    id: "neo-noir-essentials",
    name: "Neo-Noir Essentials",
    description: "Moody thrillers, paranoid mysteries, and city-at-night favorites.",
    movie_count: 12,
    is_public: true,
    updated_at: "2026-03-16T10:00:00Z",
    posterUrls: [
      fixtureMovies.parasite.cached_poster_url ?? "",
      fixtureMovies.dunePartTwo.cached_poster_url ?? "",
      fixtureMovies.killersOfTheFlowerMoon.cached_poster_url ?? "",
    ],
  }),
  makeList({
    id: "oscar-upsets",
    name: "Oscar Upsets",
    description: "Surprising wins, painful losses, and the ballot chaos that followed.",
    movie_count: 9,
    is_public: false,
    updated_at: "2026-03-10T12:30:00Z",
    posterUrls: [
      fixtureMovies.parasite.cached_poster_url ?? "",
      fixtureMovies.eeaao.cached_poster_url ?? "",
    ],
  }),
  makeList({
    id: "comfort-rewatches",
    name: "Comfort Rewatches",
    description: "The movies you put on when you want something warm, sharp, and instantly rewatchable.",
    movie_count: 18,
    is_public: true,
    updated_at: "2026-03-18T21:15:00Z",
    posterUrls: [
      fixtureMovies.holdovers.cached_poster_url ?? "",
      fixtureMovies.barbie.cached_poster_url ?? "",
      fixtureMovies.oppenheimer.cached_poster_url ?? "",
    ],
  }),
];

export const publicStoryLists: StoryList[] = [
  storyLists[0],
  storyLists[2],
  makeList({
    id: "international-one-nighters",
    name: "International One-Nighters",
    description: "Lean, memorable films that hit hard in under two hours.",
    movie_count: 14,
    is_public: true,
    updated_at: "2026-03-17T09:00:00Z",
    posterUrls: [
      fixtureMovies.parasite.cached_poster_url ?? "",
      fixtureMovies.pastLives.cached_poster_url ?? "",
    ],
  }),
];

export const privateStoryLists: StoryList[] = [
  makeList({
    id: "rewatch-later-private",
    name: "Rewatch Later (Private)",
    description: "Movies I want to revisit before locking final rankings.",
    movie_count: 7,
    is_public: false,
    updated_at: "2026-03-19T08:30:00Z",
    posterUrls: [
      fixtureMovies.holdovers.cached_poster_url ?? "",
      fixtureMovies.americanFiction.cached_poster_url ?? "",
    ],
  }),
  makeList({
    id: "ranked-but-not-placed-private",
    name: "Ranked but Not Placed (Private)",
    description: "Strong contenders that still need a home.",
    movie_count: 5,
    is_public: false,
    updated_at: "2026-03-14T13:00:00Z",
    posterUrls: [
      fixtureMovies.poorThings.cached_poster_url ?? "",
      fixtureMovies.killersOfTheFlowerMoon.cached_poster_url ?? "",
    ],
  }),
];
