/**
 * Starter picks for the new-user onboarding carousel. The award-comparison
 * exports that used to live in this file (BEST_PICTURE_WINNERS, getActualWinner,
 * getContextMessage) have moved to src/data/officialAwardWinners.ts, which is
 * backed by the verified public.official_award_winners table instead of a
 * static object — see PRODUCT_DECISION_LOG.md, July 2026.
 */

/**
 * Starter picks — curated films for the new-user "Pick a movie you love" carousel.
 *
 * Selection criteria:
 * - Widely recognisable across age groups and tastes
 * - Diverse: mix of decades (1970s–2020s), genres, and tones
 * - Each belongs to a year with plenty of other known contenders
 *   so YearExplorer feels rich immediately after picking
 * - NOT required to be Oscar winners — the point is user opinion
 */
export interface StarterPick {
  title: string;
  year: number;
}

export const STARTER_PICKS: StarterPick[] = [
  // 1970s — a canonically great year for film
  { title: "Chinatown", year: 1974 },
  // 1980s — beloved underdog / cultural touchstone
  { title: "Do the Right Thing", year: 1989 },
  // Early 90s — most-loved snub on IMDb Top 250
  { title: "The Shawshank Redemption", year: 1994 },
  // Late 90s / prestige era
  { title: "Magnolia", year: 1999 },
  // 2000s blockbuster — launches a very rich year
  { title: "The Dark Knight", year: 2008 },
  // 2010s — social-media generation classic
  { title: "The Social Network", year: 2010 },
  // 2010s — sci-fi / prestige crossover
  { title: "Arrival", year: 2016 },
  // Late 2010s — horror crossover into awards
  { title: "Get Out", year: 2017 },
  // 2020s — recent landmark
  { title: "Everything Everywhere All at Once", year: 2022 },
  // 2020s — contemporary conversation starter
  { title: "Oppenheimer", year: 2023 },
];
