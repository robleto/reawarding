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
