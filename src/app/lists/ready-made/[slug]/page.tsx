import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import { isPremiumUser } from '@/lib/premium';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { slugifyTitle } from '@/utils/slug';
import { normalizeImageUrl } from '@/utils/imageUrl';
import ReadyMadeDetailClient from '@/components/lists/ReadyMadeDetailClient';
import RatingChip from '@/components/ui/RatingChip';

type MovieItem = {
  id: string;
  title: string;
  release_year: number | null;
  poster_url: string | null;
  ranking: number | null;
};

type ReadyCategory = 'director' | 'genre' | 'decade';
type ReadyMadeData = {
  user: any | null;
  isPremium: boolean;
  category: ReadyCategory | null;
  label: string | null; // director name, genre name or decade label
  decadeStart?: number | null;
  count: number; // display count (may be filtered)
  totalCount: number; // original total before filtering
  movies: MovieItem[];
};

function formatDirectorListName(director: string, count: number) { return `${director}: ${count} You’ve Seen`; }
function formatGenreListName(genre: string, count: number) { return `Genre - ${genre}: ${count} You’ve Seen`; }
function formatDecadeListName(decade: string, count: number) { return `Decade - ${decade}: ${count} You’ve Seen`; }

function PremiumLockLink() {
  return (
    <Link
      href="/premium"
      className="inline-flex items-center gap-1.5 px-4 py-2 text-gray-400 bg-gray-800 border border-gray-700 rounded hover:text-gray-300 hover:border-gray-600"
      title="Saving Ready-Made lists is a premium feature"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 016 0v3H9z"/></svg>
      Unlock Premium
    </Link>
  );
}

async function getData(slug: string): Promise<ReadyMadeData> {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { user: null, isPremium: false, category: null, label: null, count: 0, totalCount: 0, movies: [] };
  const isPremium = await isPremiumUser(supabase, user.id);

  // Build maps from seen movies and match by slug across director/genre/decade
  const { data: rows } = await supabase
    .from('rankings')
    .select('ranking, seen_it, movie:movies(id, title, director, genres, release_year, poster_url)')
    .eq('user_id', user.id)
    .eq('seen_it', true);

  const byDirector = new Map<string, MovieItem[]>();
  const byGenre = new Map<string, MovieItem[]>();
  const byDecade = new Map<number, MovieItem[]>();
  for (const r of (rows as any[] | null) || []) {
    const mv: any = r.movie;
    const m = Array.isArray(mv) ? mv?.[0] : mv;
    const director: string | null = m?.director ?? null;
    if (director) {
      const bucket = byDirector.get(director) || [];
      bucket.push({
        id: m.id as string,
        title: m.title as string,
        release_year: (m.release_year as number | null) ?? null,
        poster_url: (m.poster_url as string | null),
        ranking: (r.ranking as number | null) ?? null,
      });
      byDirector.set(director, bucket);
    }
    const genres: string[] | null = m?.genres ?? null;
    if (Array.isArray(genres)) {
      for (const g of genres) {
        const gb = byGenre.get(g) || [];
        gb.push({
          id: m.id as string,
          title: m.title as string,
          release_year: (m.release_year as number | null) ?? null,
          poster_url: (m.poster_url as string | null),
          ranking: (r.ranking as number | null) ?? null,
        });
        byGenre.set(g, gb);
      }
    }
    const year: number | null = m?.release_year ?? null;
    if (year && year >= 1900) {
      const start = Math.floor(year / 10) * 10;
      const db = byDecade.get(start) || [];
      db.push({
        id: m.id as string,
        title: m.title as string,
        release_year: (m.release_year as number | null) ?? null,
        poster_url: (m.poster_url as string | null),
        ranking: (r.ranking as number | null) ?? null,
      });
      byDecade.set(start, db);
    }
  }
  // Try director match
  for (const d of byDirector.keys()) {
    if (slugifyTitle(d) === slug) {
      const list = (byDirector.get(d) || []).sort((a, b) => (b.ranking ?? 0) - (a.ranking ?? 0));
      return { user, isPremium, category: 'director', label: d, count: list.length, totalCount: list.length, movies: list };
    }
  }
  // Try genre match
  for (const g of byGenre.keys()) {
    if (slugifyTitle(g) === slug) {
      const all = (byGenre.get(g) || []).sort((a, b) => (b.ranking ?? 0) - (a.ranking ?? 0));
      const filtered = all.length > 100 ? all.filter((m) => (m.ranking ?? 0) >= 9) : all;
      return { user, isPremium, category: 'genre', label: g, count: filtered.length, totalCount: all.length, movies: filtered };
    }
  }
  // Try decade match
  for (const start of byDecade.keys()) {
    const label = `${start}s`;
    if (slugifyTitle(label) === slug) {
      const all = (byDecade.get(start) || []).sort((a, b) => (b.ranking ?? 0) - (a.ranking ?? 0));
      const filtered = all.length > 100 ? all.filter((m) => (m.ranking ?? 0) >= 9) : all;
      return { user, isPremium, category: 'decade', label, decadeStart: start, count: filtered.length, totalCount: all.length, movies: filtered };
    }
  }
  return { user, isPremium, category: null, label: null, count: 0, totalCount: 0, movies: [] };
}
async function saveDirectorList(formData: FormData) {
  'use server';
  const director = String(formData.get('director') || '');
  const count = Number(formData.get('count') || 0);
  const publishNow = String(formData.get('publish') || '0') === '1';
  let ids = String(formData.get('movie_ids') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!(await isPremiumUser(supabase, user.id))) redirect('/premium');

  // Fallback: if no ids were posted, re-collect on server
  if (ids.length === 0 && director) {
    // 1) Get movie ids for this director
    const { data: movieRows } = await supabase
      .from('movies')
      .select('id')
      .eq('director', director);
    const movieIds = (movieRows || []).map((m) => m.id as string);
    if (movieIds.length) {
      // 2) Intersect with user's seen rankings and sort by ranking desc
      const { data: rankRows } = await supabase
        .from('rankings')
        .select('movie_id, ranking')
        .eq('user_id', user.id)
        .eq('seen_it', true)
        .in('movie_id', movieIds);
      ids = Array.from(
        new Set(
          (rankRows || [])
            .sort((a, b) => ((b.ranking ?? 0) - (a.ranking ?? 0)))
            .map((r) => r.movie_id as string)
        )
      );
    }
  }

  const name = formatDirectorListName(director, count);
  const { data: existingList } = await supabase
    .from('movie_lists')
    .select('id, is_public')
    .eq('user_id', user.id)
    .eq('name', name)
    .maybeSingle();

  let listId: string | null = existingList?.id ?? null;
  if (!listId) {
    const { data: listRows, error: listErr } = await supabase
      .from('movie_lists')
      .insert({ user_id: user.id, name, description: `Auto-generated list of films by ${director}`, is_public: publishNow ? true : false })
      .select('id')
      .limit(1);
    if (listErr || !listRows?.[0]) redirect('/lists');
    listId = listRows[0].id as string;
  } else if (publishNow && existingList && (existingList as any).is_public === false) {
    await supabase
      .from('movie_lists')
      .update({ is_public: true })
      .eq('id', listId);
  }

  const { data: existingItems } = await supabase
    .from('movie_list_items')
    .select('movie_id')
    .eq('list_id', listId);
  const existingIds = new Set((existingItems || []).map((r) => r.movie_id));
  const newIds = ids.filter((id) => !existingIds.has(id));

  if (newIds.length > 0) {
    const nextStart = (existingItems?.length || 0) + newIds.length;
    const items = newIds.map((movie_id, idx) => ({ list_id: listId!, movie_id, ranking: nextStart - idx }));
    await supabase.from('movie_list_items').insert(items);
  }
  await supabase
    .from('movie_lists')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', listId);
  redirect('/lists');
}

async function saveGenreList(formData: FormData) {
  'use server';
  const genre = String(formData.get('genre') || '');
  const count = Number(formData.get('count') || 0);
  const publishNow = String(formData.get('publish') || '0') === '1';
  const totalSeen = Number(formData.get('total_seen') || 0);
  let ids = String(formData.get('movie_ids') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!(await isPremiumUser(supabase, user.id))) redirect('/premium');

  if (ids.length === 0 && genre) {
    const { data: movieRows } = await supabase.from('movies').select('id, genres');
    const candidateIds = (movieRows || []).filter((m: any) => Array.isArray(m.genres) && m.genres.includes(genre)).map((m: any) => m.id as string);
    if (candidateIds.length) {
      const { data: rankRows } = await supabase
        .from('rankings')
        .select('movie_id, ranking')
        .eq('user_id', user.id)
        .eq('seen_it', true)
        .in('movie_id', candidateIds);
      const rows = (rankRows || []);
      const filtered = totalSeen > 100 ? rows.filter((r) => (r.ranking ?? 0) >= 9) : rows;
      ids = Array.from(new Set(filtered.sort((a, b) => ((b.ranking ?? 0) - (a.ranking ?? 0))).map((r) => r.movie_id as string)));
    }
  }
  const name = formatGenreListName(genre, count);
  const { data: existingList } = await supabase
    .from('movie_lists')
    .select('id, is_public')
    .eq('user_id', user.id)
    .eq('name', name)
    .maybeSingle();
  let listId: string | null = existingList?.id ?? null;
  if (!listId) {
    const { data: listRows } = await supabase
      .from('movie_lists')
      .insert({ user_id: user.id, name, description: `Auto-generated list for ${genre}`, is_public: publishNow ? true : false })
      .select('id')
      .limit(1);
    if (!listRows?.[0]) redirect('/lists');
    listId = listRows[0].id as string;
  } else if (publishNow && existingList && (existingList as any).is_public === false) {
    await supabase.from('movie_lists').update({ is_public: true }).eq('id', listId);
  }
  const { data: existingItems } = await supabase.from('movie_list_items').select('movie_id').eq('list_id', listId);
  const existingIds = new Set((existingItems || []).map((r) => r.movie_id));
  const newIds = ids.filter((id) => !existingIds.has(id));
  if (newIds.length) {
    const nextStart = (existingItems?.length || 0) + newIds.length;
    const items = newIds.map((movie_id, idx) => ({ list_id: listId!, movie_id, ranking: nextStart - idx }));
    await supabase.from('movie_list_items').insert(items);
  }
  await supabase.from('movie_lists').update({ updated_at: new Date().toISOString() }).eq('id', listId);
  redirect('/lists');
}

async function saveDecadeList(formData: FormData) {
  'use server';
  const decade = String(formData.get('decade') || '');
  const startYear = Number(formData.get('start_year') || 0);
  const count = Number(formData.get('count') || 0);
  const publishNow = String(formData.get('publish') || '0') === '1';
  const totalSeen = Number(formData.get('total_seen') || 0);
  let ids = String(formData.get('movie_ids') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!(await isPremiumUser(supabase, user.id))) redirect('/premium');
  if (ids.length === 0 && startYear) {
    const { data: movieRows } = await supabase.from('movies').select('id, release_year');
    const candidateIds = (movieRows || [])
      .filter((m: any) => typeof m.release_year === 'number' && m.release_year >= startYear && m.release_year < startYear + 10)
      .map((m: any) => m.id as string);
    if (candidateIds.length) {
      const { data: rankRows } = await supabase
        .from('rankings')
        .select('movie_id, ranking')
        .eq('user_id', user.id)
        .eq('seen_it', true)
        .in('movie_id', candidateIds);
      const rows = (rankRows || []);
      const filtered = totalSeen > 100 ? rows.filter((r) => (r.ranking ?? 0) >= 9) : rows;
      ids = Array.from(new Set(filtered.sort((a, b) => ((b.ranking ?? 0) - (a.ranking ?? 0))).map((r) => r.movie_id as string)));
    }
  }
  const name = formatDecadeListName(decade, count);
  const { data: existingList } = await supabase
    .from('movie_lists')
    .select('id, is_public')
    .eq('user_id', user.id)
    .eq('name', name)
    .maybeSingle();
  let listId: string | null = existingList?.id ?? null;
  if (!listId) {
    const { data: listRows } = await supabase
      .from('movie_lists')
      .insert({ user_id: user.id, name, description: `Auto-generated list for the ${decade}`, is_public: publishNow ? true : false })
      .select('id')
      .limit(1);
    if (!listRows?.[0]) redirect('/lists');
    listId = listRows[0].id as string;
  } else if (publishNow && existingList && (existingList as any).is_public === false) {
    await supabase.from('movie_lists').update({ is_public: true }).eq('id', listId);
  }
  const { data: existingItems } = await supabase.from('movie_list_items').select('movie_id').eq('list_id', listId);
  const existingIds = new Set((existingItems || []).map((r) => r.movie_id));
  const newIds = ids.filter((id) => !existingIds.has(id));
  if (newIds.length) {
    const nextStart = (existingItems?.length || 0) + newIds.length;
    const items = newIds.map((movie_id, idx) => ({ list_id: listId!, movie_id, ranking: nextStart - idx }));
    await supabase.from('movie_list_items').insert(items);
  }
  await supabase.from('movie_lists').update({ updated_at: new Date().toISOString() }).eq('id', listId);
  redirect('/lists');
}

export const dynamic = 'force-dynamic';

export default async function ReadyMadeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, isPremium, category, label, count, totalCount, movies, decadeStart } = await getData(slug);

  if (!user) {
    return (
      <div className="p-6 border rounded-lg bg-charcoal-900/60 border-gold-500/20">
        <h2 className="mb-2 text-xl font-semibold">Sign in to view this suggestion</h2>
        <Link href="/login" className="inline-block px-4 py-2 mt-2 text-black bg-gold-500 rounded">Sign In</Link>
      </div>
    );
  }

  if (!category || !label) {
    return (
      <div className="p-6 border rounded-lg bg-charcoal-900/60 border-gold-500/20">
        <p className="text-gray-300">We couldn't find that suggestion. It may require more seen films to unlock.</p>
        <Link href="/lists/ready-made" className="inline-block mt-4 text-gold-300 underline">Back to Ready‑Made</Link>
      </div>
    );
  }

  const ids = movies.map((m) => m.id).join(',');
  const isFiltered = totalCount > 100;
  const threshold = category === 'decade' ? 12 : 10;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-unbounded font-semibold flex items-center gap-3 min-w-0">
            <span className="truncate" title={label}>{label}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-800 text-xs md:text-sm text-gray-200" title="You've seen">
              {count}{isFiltered ? '∗' : ''}
            </span>
          </h1>
          <p className="mt-1 text-gray-400">
            <span>{category === 'director' ? 'Director' : category === 'genre' ? 'Genre' : 'Decade'}</span>
            {isFiltered && <span className="ml-2 text-[11px]">· {count} of {totalCount}</span>}
          </p>
          {isFiltered && (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-400">
              <RatingChip rating={9} />
              <RatingChip rating={10} />
              <span>only</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isPremium ? (
            <PremiumLockLink />
          ) : count >= threshold ? (
            category === 'director' ? (
              <form action={saveDirectorList}>
                <input type="hidden" name="director" value={label} />
                <input type="hidden" name="count" value={count} />
                <input type="hidden" name="movie_ids" value={ids} />
                <input type="hidden" name="publish" value="1" />
                <button className="px-4 py-2 text-black bg-gold-500 rounded hover:bg-gold-400" type="submit">Publish List</button>
              </form>
            ) : category === 'genre' ? (
              <form action={saveGenreList}>
                <input type="hidden" name="genre" value={label} />
                <input type="hidden" name="count" value={count} />
                <input type="hidden" name="total_seen" value={totalCount} />
                <input type="hidden" name="movie_ids" value={ids} />
                <input type="hidden" name="publish" value="1" />
                <button className="px-4 py-2 text-black bg-gold-500 rounded hover:bg-gold-400" type="submit">Publish List</button>
              </form>
            ) : (
              <form action={saveDecadeList}>
                <input type="hidden" name="decade" value={label} />
                <input type="hidden" name="start_year" value={decadeStart ?? 0} />
                <input type="hidden" name="count" value={count} />
                <input type="hidden" name="total_seen" value={totalCount} />
                <input type="hidden" name="movie_ids" value={ids} />
                <input type="hidden" name="publish" value="1" />
                <button className="px-4 py-2 text-black bg-gold-500 rounded hover:bg-gold-400" type="submit">Publish List</button>
              </form>
            )
          ) : (
            <div className="flex flex-col items-end">
              <button
                type="button"
                disabled
                className="flex items-center gap-2 px-4 py-2 text-gray-400 bg-gray-800 border border-gray-700 rounded cursor-not-allowed"
                title={`Locked until ${threshold} seen`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 016 0v3H9z"/></svg>
                Locked
              </button>
              {category === 'director' ? (
                <form action={saveDirectorList}>
                  <input type="hidden" name="director" value={label} />
                  <input type="hidden" name="count" value={count} />
                  <input type="hidden" name="movie_ids" value={ids} />
                  <input type="hidden" name="publish" value="1" />
                  <button type="submit" className="mt-2 text-[11px] text-gray-400 hover:text-gray-300" title="Publish anyway" aria-label="Publish anyway (override lock)">
                    Publish anyway
                  </button>
                </form>
              ) : category === 'genre' ? (
                <form action={saveGenreList}>
                  <input type="hidden" name="genre" value={label} />
                  <input type="hidden" name="count" value={count} />
                  <input type="hidden" name="total_seen" value={totalCount} />
                  <input type="hidden" name="movie_ids" value={ids} />
                  <input type="hidden" name="publish" value="1" />
                  <button type="submit" className="mt-2 text-[11px] text-gray-400 hover:text-gray-300" title="Publish anyway" aria-label="Publish anyway (override lock)">
                    Publish anyway
                  </button>
                </form>
              ) : (
                <form action={saveDecadeList}>
                  <input type="hidden" name="decade" value={label} />
                  <input type="hidden" name="start_year" value={decadeStart ?? 0} />
                  <input type="hidden" name="count" value={count} />
                  <input type="hidden" name="total_seen" value={totalCount} />
                  <input type="hidden" name="movie_ids" value={ids} />
                  <input type="hidden" name="publish" value="1" />
                  <button type="submit" className="mt-2 text-[11px] text-gray-400 hover:text-gray-300" title="Publish anyway" aria-label="Publish anyway (override lock)">
                    Publish anyway
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      <ReadyMadeDetailClient movies={movies} />

      <div>
        <Link href="/lists/ready-made" className="text-sm text-gold-300 hover:underline">← Back to Ready‑Made</Link>
      </div>
    </div>
  );
}
