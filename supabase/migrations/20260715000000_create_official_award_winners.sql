-- Reference data: real Academy Award winners, keyed by film/eligibility year + category.
-- Powers "Your Alternate Oscar History" (Upheld / Reawarded / Unscreened) — see
-- PRODUCT_DECISION_LOG.md, July 2026, "Premium Tier Direction".
--
-- This is global reference data, not user-owned: readable by everyone, written only
-- by the backfill script (scripts/backfill-official-winners.ts) via the service role,
-- which bypasses RLS.
create table if not exists public.official_award_winners (
  id bigint generated always as identity primary key,
  year integer not null,
  category text not null default 'best-picture',
  ceremony_number integer not null,
  film_title text not null,
  movie_id uuid references public.movies(id),
  match_status text not null default 'unmatched' check (match_status in ('matched', 'unmatched', 'needs_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint official_award_winners_year_category_unique unique (year, category)
);

alter table public.official_award_winners enable row level security;

create policy official_award_winners_select_all on public.official_award_winners
  for select using (true);
