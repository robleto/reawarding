#!/usr/bin/env ts-node
/**
 * One-time backfill of public.official_award_winners from the curated Best Picture
 * list in scripts/data/best-picture-winners.json. Matches each winner to an existing
 * row in public.movies by normalized title + release year (±1, since a film's
 * Academy eligibility year and its movies.release_year can disagree by a year for
 * festival/limited releases). No fuzzy guessing across a year gap wider than that —
 * ambiguous or missing matches are written with match_status='needs_review' or
 * 'unmatched' and logged, never silently resolved (Law 5).
 *
 * `year` in the source list is each film's real calendar release year (i.e. what
 * ends up in movies.release_year), not the ceremony's eligibility-period label —
 * those disagree for the 2nd-6th ceremonies, which used split "19XX/YY" eligibility
 * windows (e.g. the 5th ceremony, "1931/32", awarded Grand Hotel, a 1932 release).
 *
 * This is not a recurring ingest job. Re-run only to append one new year after each
 * ceremony, or after adding entries to the source list.
 *
 * Requirements:
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/backfill-official-winners.ts --dry-run
 *   TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/backfill-official-winners.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

interface OfficialBestPictureWinner {
  ceremony: number;
  year: number;
  title: string;
}

// Loaded as JSON rather than imported as a TS module — this script runs under
// ts-node in a package with no "type": "module" set, and a relative TS import
// gets misdetected as ESM (which requires explicit file extensions) the moment
// any `import`/`export` syntax appears in this file. Paths below are resolved
// from process.cwd() (always the repo root via `npm run`) rather than
// __dirname/import.meta.url, since which of those is even defined depends on
// which module mode Node decides to sniff this file as.
const BEST_PICTURE_WINNERS: OfficialBestPictureWinner[] = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'scripts', 'data', 'best-picture-winners.json'), 'utf8')
);

// Self-loads env from .env/.env.local, same pattern as scripts/dev-db.mjs —
// never cat/grep these files from a terminal, load them in-process instead.
function loadEnvVar(name: string): string | null {
  const repoRoot = process.cwd();
  for (const file of ['.env.local', '.env']) {
    const p = path.join(repoRoot, file);
    if (!fs.existsSync(p)) continue;
    const match = fs.readFileSync(p, 'utf8').match(new RegExp(`^${name}=(.*)$`, 'm'));
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || loadEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || loadEnvVar('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const DRY_RUN = process.argv.includes('--dry-run');

function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface MovieCandidate {
  id: string;
  title: string;
  original_title: string | null;
  release_year: number | null;
}

async function findCandidates(year: number): Promise<MovieCandidate[]> {
  const { data, error } = await supabase
    .from('movies')
    .select('id, title, original_title, release_year')
    .gte('release_year', year - 1)
    .lte('release_year', year + 1);
  if (error) throw error;
  return data ?? [];
}

function pickMatch(title: string, year: number, candidates: MovieCandidate[]) {
  const normQuery = normalizeTitle(title);
  let best: MovieCandidate | null = null;
  let bestScore = -1;
  let ties = 0;

  for (const c of candidates) {
    const normTitle = normalizeTitle(c.title || '');
    const normOriginal = normalizeTitle(c.original_title || '');
    if (normTitle !== normQuery && normOriginal !== normQuery) continue;

    let score = 0;
    if (c.release_year === year) score += 2;
    else score += 1; // within the ±1 window but not exact

    if (score === bestScore) ties += 1;
    if (score > bestScore) {
      best = c;
      bestScore = score;
      ties = 0;
    }
  }

  return { match: ties > 0 ? null : best, hadTie: ties > 0 };
}

async function main() {
  console.log(`${DRY_RUN ? '[dry-run] ' : ''}Backfilling ${BEST_PICTURE_WINNERS.length} official Best Picture winners...\n`);

  const rows: Array<{
    year: number;
    category: string;
    ceremony_number: number;
    film_title: string;
    movie_id: string | null;
    match_status: 'matched' | 'unmatched' | 'needs_review';
  }> = [];

  const needsReview: string[] = [];
  const unmatched: string[] = [];

  for (const winner of BEST_PICTURE_WINNERS) {
    const candidates = await findCandidates(winner.year);
    const { match, hadTie } = pickMatch(winner.title, winner.year, candidates);

    let status: 'matched' | 'unmatched' | 'needs_review' = 'unmatched';
    if (match) status = 'matched';
    else if (hadTie) status = 'needs_review';

    if (status === 'needs_review') needsReview.push(`${winner.year} — ${winner.title} (${candidates.length} same-title candidates, ambiguous year)`);
    if (status === 'unmatched') unmatched.push(`${winner.year} — ${winner.title} (not found in movies within ±1 year)`);

    rows.push({
      year: winner.year,
      category: 'best-picture',
      ceremony_number: winner.ceremony,
      film_title: winner.title,
      movie_id: match?.id ?? null,
      match_status: status,
    });
  }

  console.log(`Matched: ${rows.filter((r) => r.match_status === 'matched').length}`);
  console.log(`Needs review: ${needsReview.length}`);
  needsReview.forEach((l) => console.log(`  - ${l}`));
  console.log(`Unmatched: ${unmatched.length}`);
  unmatched.forEach((l) => console.log(`  - ${l}`));

  if (DRY_RUN) {
    console.log('\nDry run — no rows written.');
    return;
  }

  const { error } = await supabase
    .from('official_award_winners')
    .upsert(rows, { onConflict: 'year,category' });

  if (error) throw error;
  console.log(`\nWrote ${rows.length} rows to official_award_winners.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
