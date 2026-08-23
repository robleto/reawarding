-- Seed the 99th Academy Awards ceremony row so the season countdown has a
-- date to count toward. Nominees are not announced until January 21, 2027, so
-- this row deliberately has no award_categories or nominations behind it yet —
-- the countdown only needs `event_date`.
--
-- `year` is the FILM year (2026), not the telecast year (2027). This matches
-- the 98th row, src/lib/awardsSeason.ts (CEREMONY_DATES is keyed by film year),
-- and getActiveAwardsSeasonYear(), which returns 2026 for any date after
-- March 31, 2026. Keying this on 2027 would make the countdown invisible.
--
-- Date verified 2026-08-23 against the Academy/ABC announcement of April 7,
-- 2026, corroborated by Deadline, Screen Daily, and The Gold Knight. It agrees
-- with CEREMONY_DATES[2026] in src/lib/awardsSeason.ts, which was independently
-- verified and had its "TENTATIVE" warning removed the same day.
--
-- Note that awardsSeason.ts is NOT redundant with this table: it also carries
-- NOMINATIONS_DATES (2027-01-21 for the 99th), which `ceremonies` has no column
-- for, and the 100th (film year 2027, 2028-03-05), which is not seeded here.
-- Don't retire that constant in favour of this row without first deciding where
-- nominations dates live.
--
-- Idempotent: safe to re-run.
INSERT INTO ceremonies (domain, year, official_name, short_name, event_date, location)
VALUES (
  'film',
  2026,
  '99th Academy Awards',
  '99th Oscars',
  '2027-03-14',
  'Dolby Theatre, Hollywood, Los Angeles, California, U.S.'
)
ON CONFLICT (domain, year) DO UPDATE
  SET official_name = EXCLUDED.official_name,
      short_name    = EXCLUDED.short_name,
      event_date    = EXCLUDED.event_date,
      location      = EXCLUDED.location;
