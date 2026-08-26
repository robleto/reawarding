/**
 * Best Picture years people actually argue about.
 *
 * Used to order the guest year-walk (Act 2 of
 * docs/design/first-rating-payoff.md). The walk asks one question per year —
 * "should something else have won?" — and the order decides whether it works.
 *
 * **Not reverse-chronological, deliberately.** Recall is highest for recent
 * films, but *opinions* are not. Best Picture takes calcify over time: nobody
 * holds a settled, passionate view of a ceremony that just happened, because
 * the discourse hasn't resolved yet. The years people have heat about are the
 * ones with cultural consensus, and those are old. Walking newest-first marches
 * through the weakest years first and trips the walk's stop condition before
 * the visitor ever reaches the material they'd have enjoyed.
 *
 * Verified against the database 2026-08-24: every year below is `matched` in
 * `official_award_winners`, and every `rival` exists in `movies` with a poster.
 * `candidates` is the count of films that year with a poster — it sets how full
 * the chooser row can be, and it thins out fast before 1980.
 *
 * **`rivalId` is pinned into the chooser row**, not just documentation. The rest
 * of the row is filled by `imdb_rating` with a votes floor, which produces
 * credible fields but does not reliably surface the specific film the year is
 * famous for: measured 2026-08-24, a rating-ordered top 5 omits The Social
 * Network for 2010 and Brokeback Mountain for 2005. A year whose whole premise
 * is one argument can't be offered without the other side of it.
 *
 * (Ordering by `vote_count` instead is much worse — 2010 returns Salt and
 * The A-Team. Don't.)
 *
 * Pinned by id rather than title: runtime title matching is fragile across
 * punctuation and re-releases ("GoodFellas", "Léon: The Professional"). Ids
 * verified present with posters on 2026-08-24.
 */
export interface ContestedYear {
  year: number;
  /** What the Academy picked. Denormalised for readability; the live value comes from official_award_winners. */
  academy: string;
  /** The film the argument is usually about. */
  rival: string;
  /** `movies.id` for `rival` — pinned into the chooser row so it's always on offer. */
  rivalId: string;
  /** Films that year with a poster, as of 2026-08-24. */
  candidates: number;
}

export const CONTESTED_YEARS: readonly ContestedYear[] = [
  { year: 1994, academy: "Forrest Gump", rival: "Pulp Fiction", rivalId: "6ff7aba9-7b18-4228-a739-d1984d4a9699", candidates: 39 },
  { year: 2010, academy: "The King's Speech", rival: "The Social Network", rivalId: "6a9b99c9-a4c2-415d-979e-58940d49d091", candidates: 113 },
  { year: 2016, academy: "Moonlight", rival: "La La Land", rivalId: "9231de48-3bc8-4b0a-8a07-1594e93188aa", candidates: 120 },
  { year: 1998, academy: "Shakespeare in Love", rival: "Saving Private Ryan", rivalId: "4f8d8db2-c036-44e6-9c0e-9fe2333ad311", candidates: 52 },
  { year: 2005, academy: "Crash", rival: "Brokeback Mountain", rivalId: "a441350d-3292-4800-8168-bfbb59aa9032", candidates: 66 },
  { year: 1990, academy: "Dances with Wolves", rival: "GoodFellas", rivalId: "19ec7a5d-09dc-4e90-9a6b-d94f336f1387", candidates: 39 },
  { year: 2018, academy: "Green Book", rival: "Roma", rivalId: "23c45c65-9ea9-4b51-92c3-c087d1c6f774", candidates: 126 },
  { year: 2014, academy: "Birdman", rival: "Boyhood", rivalId: "2e9976e7-be4d-474a-9fd5-d361d7208a36", candidates: 125 },
  { year: 1980, academy: "Ordinary People", rival: "Raging Bull", rivalId: "bcd89f11-538c-4237-8041-ad363084f36a", candidates: 24 },
  // Below ~20 candidates the chooser row can't fill. Both are canonical
  // arguments and the rival is present (Citizen Kane really is in there), so
  // they stay in the list — the row just renders shorter.
  { year: 1976, academy: "Rocky", rival: "Taxi Driver", rivalId: "bd4da75c-3e69-426c-93c9-60f5f7651a5d", candidates: 13 },
  { year: 1941, academy: "How Green Was My Valley", rival: "Citizen Kane", rivalId: "56e2c541-42cd-4dc1-a95d-36d6a1b8cecf", candidates: 6 },
] as const;

/** Votes floor for the rating-ordered fill. Below this, ratings are noise. */
export const WALK_MIN_VOTES = 25000;

/** Chooser row target. Years with fewer candidates render a shorter row. */
export const WALK_CHOICES_PER_YEAR = 4;

/** Stop after this many years even if the visitor is still engaged. */
export const WALK_MAX_YEARS = 8;

/** Two skips in a row reads as "I'm done", not "ask me differently". */
export const WALK_SKIP_LIMIT = 2;

/**
 * Show the quiet mid-walk "sign up" hint once this many years are decided —
 * well before the walk's own end (WALK_MAX_YEARS) triggers the full Act 3
 * ask. Some visitors stop after a handful of verdicts without exhausting the
 * walk; without this they'd have no save option until then.
 */
export const WALK_SAVE_HINT_AFTER = 2;
