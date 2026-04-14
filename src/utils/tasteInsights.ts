import type { Movie } from "@/types/types";

/** Top genre tags derived from the user's rated movies. */
export interface TasteProfile {
  /** Top 3 genres by frequency, weighted by rating. */
  topGenres: { genre: string; count: number }[];
  /** Short flavour labels like "Modern blockbuster cinema". Max 3. */
  flavourTags: string[];
  /** Average decade the user gravitates toward. */
  eraLabel: string | null;
  /** Total rated movies. */
  ratedCount: number;
}

/** For each year the user has data, who's the current leader? */
export interface YearLeader {
  year: number;
  leader: Movie;
  nomineeCount: number;
  neededForBallot: number;
}

// ── helpers ──────────────────────────────────────────────────────────

const DECADE_LABELS: Record<number, string> = {
  1950: "Golden Age classics",
  1960: "New Wave & revolution",
  1970: "New Hollywood grit",
  1980: "80s blockbusters",
  1990: "90s indie & blockbuster boom",
  2000: "2000s prestige cinema",
  2010: "2010s modern cinema",
  2020: "Contemporary film",
};

function decadeOf(year: number): number {
  return Math.floor(year / 10) * 10;
}

const FLAVOUR_MAP: Record<string, string> = {
  Action: "High-energy action",
  Adventure: "Epic adventure",
  Animation: "Animation & imagination",
  Comedy: "Sharp comedy",
  Crime: "Crime & noir",
  Documentary: "Documentary storytelling",
  Drama: "Character-driven drama",
  Family: "Family cinema",
  Fantasy: "Fantasy & world-building",
  History: "Historical epic",
  Horror: "Horror & suspense",
  Music: "Musical storytelling",
  Mystery: "Mystery & intrigue",
  Romance: "Romance",
  "Science Fiction": "Sci-fi & speculation",
  Thriller: "Tension & thriller",
  War: "War & conflict",
  Western: "The Western",
};

// ── public API ───────────────────────────────────────────────────────

/** Derive taste insights from the user's rated movies. Works with as few as 1 movie. */
export function buildTasteProfile(ratedMovies: Movie[]): TasteProfile {
  if (ratedMovies.length === 0) {
    return { topGenres: [], flavourTags: [], eraLabel: null, ratedCount: 0 };
  }

  // Count genres weighted by rating (higher rated = more representative)
  const genreWeight = new Map<string, number>();
  const decadeCounts = new Map<number, number>();

  for (const movie of ratedMovies) {
    const rating = movie.rankings?.[0]?.ranking ?? 5;
    const weight = rating / 10; // 0.1–1.0

    for (const genre of movie.genres ?? []) {
      genreWeight.set(genre, (genreWeight.get(genre) ?? 0) + weight);
    }

    const decade = decadeOf(movie.release_year);
    decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + 1);
  }

  const topGenres = [...genreWeight.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([genre, count]) => ({ genre, count: Math.round(count * 10) / 10 }));

  const flavourTags = topGenres
    .map((g) => FLAVOUR_MAP[g.genre] ?? g.genre)
    .slice(0, 3);

  // Dominant decade
  let eraLabel: string | null = null;
  if (decadeCounts.size > 0) {
    const topDecade = [...decadeCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    eraLabel = DECADE_LABELS[topDecade] ?? `${topDecade}s cinema`;
  }

  return { topGenres, flavourTags, eraLabel, ratedCount: ratedMovies.length };
}

/** Get the current leader for every year the user has rated movies in. */
export function getYearLeaders(ratedMovies: Movie[]): YearLeader[] {
  const byYear = new Map<number, Movie[]>();

  for (const movie of ratedMovies) {
    const year = movie.release_year;
    if (!Number.isFinite(year)) continue;
    const list = byYear.get(year) ?? [];
    list.push(movie);
    byYear.set(year, list);
  }

  return [...byYear.entries()]
    .map(([year, yearMovies]) => {
      const sorted = [...yearMovies].sort((a, b) => {
        const ra = a.rankings?.[0]?.ranking ?? 0;
        const rb = b.rankings?.[0]?.ranking ?? 0;
        return rb - ra;
      });
      const leader = sorted[0];
      const nomineeCount = sorted.filter((m) => (m.rankings?.[0]?.ranking ?? 0) >= 7).length;
      return {
        year,
        leader,
        nomineeCount,
        neededForBallot: Math.max(0, 10 - nomineeCount),
      };
    })
    .sort((a, b) => b.year - a.year);
}
