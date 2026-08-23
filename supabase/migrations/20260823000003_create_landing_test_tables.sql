-- Landing-page A/B test scaffolding — see docs/validation/landing-page-test.md.
--
-- Two marketing pages measure which promise converts:
--   /oscar-tracker  = variant A ("never lose track of the race")
--   /your-awards    = variant B ("hand out your own awards")
--
-- These tables are deliberately absent from src/types/supabase.ts. They are
-- temporary test furniture with a defined end date, not product schema — the
-- landing routes talk to them through an untyped service-role client
-- (src/lib/landingDb.ts). If the test becomes permanent, regenerate types.

create table if not exists public.landing_signups (
  id uuid primary key default gen_random_uuid(),
  variant text not null check (variant in ('A', 'B')),
  email text not null,
  -- Step 2, the costly action. `tracker_link` holds a pasted URL or a
  -- description of whatever they actually used last season. `tracker_declined`
  -- records "I didn't have one" — a finding in its own right: those signups are
  -- awards-curious, not completionists, and a high rate here means the traffic
  -- is aimed at the wrong segment.
  tracker_link text,
  tracker_declined boolean not null default false,
  tracker_at timestamptz,
  utm_source text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.landing_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  variant text not null check (variant in ('A', 'B')),
  event text not null check (
    event in ('lp_view', 'lp_scroll_50', 'cta_click', 'email_submitted', 'step2_upload', 'step2_declined')
  ),
  path text,
  utm_source text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists landing_signups_created_at_idx on public.landing_signups (created_at desc);
create index if not exists landing_signups_variant_idx on public.landing_signups (variant);
create index if not exists landing_events_created_at_idx on public.landing_events (created_at desc);
create index if not exists landing_events_variant_event_idx on public.landing_events (variant, event);

-- RLS on with NO policies: stricter than public.feedback (which allows anon
-- insert) because every write here goes through an API route on the service
-- role, which bypasses RLS. Nothing should reach these tables from a browser.
alter table public.landing_signups enable row level security;
alter table public.landing_events enable row level security;

-- Reading the result is the entire point of the test, so ship the query with
-- the schema rather than rediscovering it under time pressure in January.
-- Denominator is distinct sessions that actually rendered the page, so bounced
-- prefetches and bot hits don't quietly inflate the conversion rate.
create or replace view public.landing_funnel as
with sessions as (
  select variant, count(distinct session_id) as sessions
  from public.landing_events
  where event = 'lp_view'
  group by variant
)
select
  s.variant,
  s.sessions,
  (select count(*) from public.landing_signups g where g.variant = s.variant) as signups,
  round(
    100.0 * (select count(*) from public.landing_signups g where g.variant = s.variant)
    / nullif(s.sessions, 0),
    2
  ) as signup_pct,
  (select count(*) from public.landing_signups g
    where g.variant = s.variant and g.tracker_link is not null) as trackers_shared,
  (select count(*) from public.landing_signups g
    where g.variant = s.variant and g.tracker_declined) as had_no_tracker,
  round(
    100.0 * (select count(*) from public.landing_signups g
      where g.variant = s.variant and g.tracker_link is not null)
    / nullif((select count(*) from public.landing_signups g where g.variant = s.variant), 0),
    2
  ) as tracker_share_pct
from sessions s
order by s.variant;
