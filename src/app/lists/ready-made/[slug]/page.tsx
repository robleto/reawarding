import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import { isPremiumUser } from '@/lib/premium';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { slugifyTitle } from '@/utils/slug';
import ReadyMadeDetailClient from '@/components/lists/ReadyMadeDetailClient';
import RatingChip from '@/components/ui/RatingChip';
import { ArrowLeft, Lock } from 'lucide-react';

type MovieItem = {
  id: string;
  title: string;
  release_year: number | null;
  poster_url: string | null;
  ranking: number | null;
};

type ReadyCategory = 'director' | 'actor' | 'genre' | 'decade';
type ReadyMadeData = {
  user: any | null;
  isPremium: boolean;
  category: ReadyCategory | null;
  label: string | null; // director/actor name, genre name or decade label
  decadeStart?: number | null;
  count: number; // display count (may be filtered)
  totalCount: number; // original total before filtering
  movies: MovieItem[];
};

// Movie count isn't part of the name — it's already shown separately
// wherever the list is displayed (e.g. "10 movies" under the title), so
// baking it into the name too was pure redundancy.
function formatDirectorListName(director: string, _count: number) { return director; }
function formatActorListName(actor: string, _count: number) { return `Actor - ${actor}`; }
function formatGenreListName(genre: string, _count: number) { return `Genre - ${genre}`; }
function formatDecadeListName(decade: string, _count: number) { return `Decade - ${decade}`; }

function PremiumLockLink() {
  return (
    <Link
      href="/premium"
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-gray-400 bg-white/5 border border-white/10 backdrop-blur-sm hover:text-gray-300 hover:bg-white/10 transition-colors"
      title="Saving Ready-Made lists is a premium feature"
    >
      <Lock className="w-4 h-4" />
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

  // Build maps from seen movies and match by slug across director/actor/genre/decade
  const { data: rows } = await supabase
    .from('rankings')
    .select('ranking, seen_it, movie:movies(id, title, director, cast_list, genres, release_year, poster_url)')
    .eq('user_id', user.id)
    .eq('seen_it', true);

  const byDirector = new Map<string, MovieItem[]>();
  const byActor = new Map<string, MovieItem[]>();
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
    const castList: string[] | null = m?.cast_list ?? null;
    if (Array.isArray(castList)) {
      for (const actor of castList) {
        if (!actor) continue;
        const ab = byActor.get(actor) || [];
        ab.push({
          id: m.id as string,
          title: m.title as string,
          release_year: (m.release_year as number | null) ?? null,
          poster_url: (m.poster_url as string | null),
          ranking: (r.ranking as number | null) ?? null,
        });
        byActor.set(actor, ab);
      }
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
  // Try actor match
  for (const a of byActor.keys()) {
    if (slugifyTitle(a) === slug) {
      const list = (byActor.get(a) || []).sort((x, y) => (y.ranking ?? 0) - (x.ranking ?? 0));
      return { user, isPremium, category: 'actor', label: a, count: list.length, totalCount: list.length, movies: list };
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
  // Land on the real, now-editable list — not the /lists carousel — so
  // Publish is the moment this suggestion evolves into a proper list the
  // user can keep adding to, reordering, and toggling public/private.
  redirect(`/lists/${listId}`);
}

async function saveActorList(formData: FormData) {
  'use server';
  const actor = String(formData.get('actor') || '');
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
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!(await isPremiumUser(supabase, user.id))) redirect('/premium');

  if (ids.length === 0 && actor) {
    const { data: movieRows } = await supabase.from('movies').select('id, cast_list');
    const candidateIds = (movieRows || [])
      .filter((m: any) => Array.isArray(m.cast_list) && m.cast_list.includes(actor))
      .map((m: any) => m.id as string);
    if (candidateIds.length) {
      const { data: rankRows } = await supabase
        .from('rankings')
        .select('movie_id, ranking')
        .eq('user_id', user.id)
        .eq('seen_it', true)
        .in('movie_id', candidateIds);
      ids = Array.from(
        new Set(
          (rankRows || [])
            .sort((a, b) => ((b.ranking ?? 0) - (a.ranking ?? 0)))
            .map((r) => r.movie_id as string)
        )
      );
    }
  }

  const name = formatActorListName(actor, count);
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
      .insert({ user_id: user.id, name, description: `Auto-generated list of films featuring ${actor}`, is_public: publishNow ? true : false })
      .select('id')
      .limit(1);
    if (listErr || !listRows?.[0]) redirect('/lists');
    listId = listRows[0].id as string;
  } else if (publishNow && existingList && (existingList as any).is_public === false) {
    await supabase.from('movie_lists').update({ is_public: true }).eq('id', listId);
  }

  const { data: existingItems } = await supabase.from('movie_list_items').select('movie_id').eq('list_id', listId);
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
  redirect(`/lists/${listId}`);
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
  redirect(`/lists/${listId}`);
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
  redirect(`/lists/${listId}`);
}

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<ReadyCategory, string> = {
  director: 'Director',
  actor: 'Actor',
  genre: 'Genre',
  decade: 'Decade',
};

function saveActionFor(category: ReadyCategory) {
  return category === 'director' ? saveDirectorList
    : category === 'actor' ? saveActorList
    : category === 'genre' ? saveGenreList
    : saveDecadeList;
}

function hiddenFieldsFor(
  category: ReadyCategory,
  label: string,
  count: number,
  totalCount: number,
  decadeStart?: number | null
): Record<string, string | number> {
  if (category === 'director') return { director: label, count };
  if (category === 'actor') return { actor: label, count };
  if (category === 'genre') return { genre: label, count, total_seen: totalCount };
  return { decade: label, start_year: decadeStart ?? 0, count, total_seen: totalCount };
}

export default async function ReadyMadeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, isPremium, category, label, count, totalCount, movies, decadeStart } = await getData(slug);

  if (!user) {
    return (
      <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
        <h2 className="mb-2 text-xl font-bold text-white tracking-wide">Sign in to view this suggestion</h2>
        <Link href="/login" className="inline-block px-4 py-2 mt-2 rounded-full text-black bg-gold-500 hover:bg-gold-400 transition-colors font-medium">Sign In</Link>
      </div>
    );
  }

  if (!category || !label) {
    return (
      <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
        <p className="text-gray-300">We couldn't find that suggestion. It may require more seen films to unlock.</p>
        <Link href="/lists/ready-made" className="inline-block mt-4 text-gold-300 hover:underline">Back to Ready‑Made</Link>
      </div>
    );
  }

  const ids = movies.map((m) => m.id).join(',');
  const isFiltered = totalCount > 100;
  const threshold = category === 'decade' ? 12 : 10;
  const saveAction = saveActionFor(category);
  const hiddenFields = hiddenFieldsFor(category, label, count, totalCount, decadeStart);

  return (
    <div className="space-y-6">
      {/* Same glass-chip back affordance as the classic list-detail page
          (src/components/list/ListDetailView.tsx) — this is a routed page,
          not the swipeable overlay, so no toss/pager gesture here, just the
          matching visual language. */}
      <Link
        href="/lists/ready-made"
        className="inline-flex items-center gap-2 h-9 pl-3 pr-4 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-sm md:text-base font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Ready‑Made</span>
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-unbounded uppercase tracking-wide flex items-center gap-3 min-w-0">
            <span className="truncate" title={label}>{label}</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/10 text-xs md:text-sm font-mono text-gray-200" title="You've seen">
              {count}{isFiltered ? '∗' : ''}
            </span>
          </h1>
          <p className="mt-1 text-gray-400">
            <span>{CATEGORY_LABELS[category]}</span>
            {isFiltered && <span className="ml-2 text-[11px] font-mono">· {count} of {totalCount}</span>}
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
            <form action={saveAction}>
              {Object.entries(hiddenFields).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              <input type="hidden" name="movie_ids" value={ids} />
              <input type="hidden" name="publish" value="1" />
              <button className="px-4 py-2 rounded-full text-black bg-gold-500 hover:bg-gold-400 transition-colors font-medium" type="submit">Publish List</button>
            </form>
          ) : (
            <div className="flex flex-col items-end gap-2 min-w-[180px]">
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-gray-400 bg-white/5 border border-white/10 backdrop-blur-sm"
                title={`Locked until ${threshold} seen`}
              >
                <Lock className="w-4 h-4" />
                Not ready to publish
              </span>
              <div className="w-full">
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gold-500" style={{ width: `${Math.min(100, (count / threshold) * 100)}%` }} />
                </div>
                <p className="mt-1.5 text-right text-[11px] font-mono uppercase tracking-wider text-gray-500">
                  {Math.max(0, threshold - count)} more seen {label} film{threshold - count === 1 ? '' : 's'} to publish
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ReadyMadeDetailClient movies={movies} />
    </div>
  );
}
