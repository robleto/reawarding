// Awards season rolls forward after this cutoff date each year.
// Month is 1-based (1 = January, 12 = December).
export const AWARDS_SEASON_CUTOFF_MONTH = 3;
export const AWARDS_SEASON_CUTOFF_DAY = 31;

export function getActiveAwardsSeasonYear(date = new Date()): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const isPastCutoff =
    month > AWARDS_SEASON_CUTOFF_MONTH ||
    (month === AWARDS_SEASON_CUTOFF_MONTH && day > AWARDS_SEASON_CUTOFF_DAY);

  return isPastCutoff ? year : year - 1;
}

/**
 * Ceremony dates keyed by *film* year, not calendar year — the 2025 films were
 * honoured at the ceremony held in March 2026. Matches the "current year"
 * definition the readiness feature uses.
 *
 * The Academy announces these a year or more ahead. Anything not yet announced
 * must NOT be guessed at — omit the year and let callers render no countdown,
 * because a wrong date here is a countdown that lies to the user.
 *
 * 99th and 100th confirmed against the Academy/ABC joint announcement
 * (April 2026); verified 2026-08-23.
 */
export const CEREMONY_DATES: Record<number, string> = {
  2024: '2025-03-02', // 97th
  2025: '2026-03-15', // 98th
  2026: '2027-03-14', // 99th — Sun 14 Mar 2027, Dolby Theatre
  2027: '2028-03-05', // 100th — Sun 5 Mar 2028
};

/**
 * Nominations-announcement dates, keyed by film year. The date the awards habit
 * restarts each cycle: the readiness list is empty until this morning, and it's
 * the moment worth reaching people on.
 */
export const NOMINATIONS_DATES: Record<number, string> = {
  2026: '2027-01-21', // announced with the 99th ceremony date
};

export function getCeremonyDateISO(
  filmYear: number = getActiveAwardsSeasonYear()
): string | null {
  return CEREMONY_DATES[filmYear] ?? null;
}

/**
 * Whole days from `from` until the ceremony for `filmYear`. Null when the date
 * is unknown; 0 once the ceremony has passed, so callers never render a
 * negative countdown.
 */
export function getDaysUntilCeremony(
  filmYear: number = getActiveAwardsSeasonYear(),
  from: Date = new Date()
): number | null {
  const iso = getCeremonyDateISO(filmYear);
  if (!iso) return null;

  // Compare date-only in UTC: a countdown that flips at the user's local
  // midnight is what people expect, and hour-level precision here is noise.
  const ceremony = Date.parse(`${iso}T00:00:00Z`);
  const today = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.max(0, Math.round((ceremony - today) / 86_400_000));
}
