-- Instrumentation for the guest year-walk — see
-- docs/design/first-rating-payoff.md, Act 2, "Instrumentation".
--
-- The year list (CONTESTED_YEARS in src/data/contestedYears.ts) is an
-- editorial guess about which Best Picture years people actually argue about.
-- This is the only way to find out if it's right, and where people quit tells
-- you whether the ordering or the walk length is wrong.
--
-- Modeled directly on the landing-page A/B test tables
-- (20260823000003_create_landing_test_tables.sql): anonymous, session-scoped,
-- RLS on with no browser-facing policies — every write goes through an API
-- route on the service role. Deliberately absent from src/types/supabase.ts
-- for the same reason those tables are: this talks to an untyped service-role
-- client, not typed product schema.
--
-- Four events cover it. "Where do people abandon" — the fifth thing the spec
-- asks for — is not a fifth event: there's no reliable client signal for
-- someone closing a tab, especially on mobile. It's derived instead, in
-- walk_abandonment below, as the last year offered in a session with no
-- decision event after it.
create table if not exists public.walk_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  event text not null check (
    event in ('year_offered', 'year_reawarded', 'year_agreed', 'year_skipped', 'walk_completed')
  ),
  -- Null only for walk_completed, which isn't about any one year.
  year integer,
  -- 0-based position in CONTESTED_YEARS at the time this fired. Recorded
  -- rather than re-derived later, so re-ordering or editing that list doesn't
  -- retroactively corrupt the read on past sessions.
  position integer,
  surface text not null check (surface in ('native', 'web')),
  created_at timestamptz not null default now()
);

create index if not exists walk_events_session_idx on public.walk_events (session_id, created_at);
create index if not exists walk_events_event_year_idx on public.walk_events (event, year);

alter table public.walk_events enable row level security;

-- Per-year conversion: of everyone offered a year, how many reawarded it,
-- agreed with the Academy, or skipped it. This is the number that tells you
-- whether CONTESTED_YEARS' ordering is right — a year with a high skip rate
-- has less real opinion behind it than the editorial guess assumed.
create or replace view public.walk_year_funnel as
select
  year,
  position,
  count(*) filter (where event = 'year_offered') as offered,
  count(*) filter (where event = 'year_reawarded') as reawarded,
  count(*) filter (where event = 'year_agreed') as agreed,
  count(*) filter (where event = 'year_skipped') as skipped,
  round(
    100.0 * count(*) filter (where event in ('year_reawarded', 'year_agreed'))
    / nullif(count(*) filter (where event = 'year_offered'), 0),
    1
  ) as decided_pct
from public.walk_events
where year is not null
group by year, position
order by position;

-- Where sessions actually stop: the last year offered with no decision
-- (reawarded/agreed/skipped) after it in the same session. A session that
-- completed the walk normally has no row here — walk_completed fired, and
-- everything before it got a decision.
create or replace view public.walk_abandonment as
with last_offered as (
  select session_id, year, position,
    row_number() over (partition by session_id order by created_at desc) as rn
  from public.walk_events
  where event = 'year_offered'
),
decided_years as (
  select session_id, year
  from public.walk_events
  where event in ('year_reawarded', 'year_agreed', 'year_skipped')
)
select lo.position, count(*) as sessions_stopped_here
from last_offered lo
left join decided_years d on d.session_id = lo.session_id and d.year = lo.year
where lo.rn = 1 and d.year is null
group by lo.position
order by lo.position;
