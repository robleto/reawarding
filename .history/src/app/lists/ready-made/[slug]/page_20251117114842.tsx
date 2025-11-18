import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { slugifyTitle } from '@/utils/slug';
import { normalizeImageUrl } from '@/utils/imageUrl';

type MovieItem = {
  id: number;
  title: string;
  release_year: number | null;
  poster_url: string | null;
  ranking: number | null;
};

type ReadyMadeData = {
  user: any | null;
  director: string | null;
  count: number;
  movies: MovieItem[];
};

function formatListName(director: string, count: number) {
  return `${director}: ${count} You’ve Seen`;
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
  if (!user) return { user: null, director: null, count: 0, movies: [] };

  // Build a map of directors from seen movies and match by slug
  const { data: rows } = await supabase
    .from('rankings')
    .select('ranking, seen_it, movie:movies(id, title, director, release_year, poster_url, cached_poster_url)')
    .eq('user_id', user.id)
    .eq('seen_it', true);

  const byDirector = new Map<string, MovieItem[]>();
  for (const r of (rows as any[] | null) || []) {
    const mv: any = r.movie;
    const m = Array.isArray(mv) ? mv?.[0] : mv;
    const director: string | null = m?.director ?? null;
    if (!director) continue;
    const bucket = byDirector.get(director) || [];
    bucket.push({
      id: m.id as number,
      title: m.title as string,
      release_year: (m.release_year as number | null) ?? null,
      poster_url: (m.cached_poster_url as string | null) ?? (m.poster_url as string | null),
      ranking: (r.ranking as number | null) ?? null,
    });
    byDirector.set(director, bucket);
  }

  let matchDirector: string | null = null;
  for (const d of byDirector.keys()) {
    if (slugifyTitle(d) === slug) {
      matchDirector = d;
      break;
    }
  }

  if (!matchDirector) return { user, director: null, count: 0, movies: [] };

  const movies = (byDirector.get(matchDirector) || []).sort((a, b) => (b.ranking ?? 0) - (a.ranking ?? 0));
  return { user, director: matchDirector, count: movies.length, movies };
}

async function saveList(formData: FormData) {
  'use server';
  const director = String(formData.get('director') || '');
  const count = Number(formData.get('count') || 0);
  const publishNow = String(formData.get('publish') || '0') === '1';
  let ids = String(formData.get('movie_ids') || '')
    .split(',')
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));

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

  // Fallback: if no ids were posted, re-collect on server
  if (ids.length === 0 && director) {
    // 1) Get movie ids for this director
    const { data: movieRows } = await supabase
      .from('movies')
      .select('id')
      .eq('director', director);
    const movieIds = (movieRows || []).map((m) => m.id as number);
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
            .map((r) => r.movie_id as number)
        )
      );
    }
  }

  const name = formatListName(director, count);
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

export const dynamic = 'force-dynamic';

export default async function ReadyMadeDetailPage({ params }: { params: { slug: string } }) {
  const { user, director, count, movies } = await getData(params.slug);

  if (!user) {
    return (
      <div className="p-6 border rounded-lg bg-gray-900/60 border-yellow-500/20">
        <h2 className="mb-2 text-xl font-semibold">Sign in to view this suggestion</h2>
        <Link href="/login" className="inline-block px-4 py-2 mt-2 text-black bg-yellow-500 rounded">Sign In</Link>
      </div>
    );
  }

  if (!director) {
    return (
      <div className="p-6 border rounded-lg bg-gray-900/60 border-yellow-500/20">
        <p className="text-gray-300">We couldn't find that suggestion. It may require at least 10 seen films by the director.</p>
        <Link href="/lists/ready-made" className="inline-block mt-4 text-yellow-300 underline">Back to Ready‑Made</Link>
      </div>
    );
  }

  const ids = movies.map((m) => m.id).join(',');
  const title = formatListName(director, count);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold md:text-3xl font-unbounded">{title}</h1>
          <p className="mt-1 text-gray-400 flex items-center gap-2">
            Auto-generated from your seen films • Director: {director}
            {count < 10 && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-gray-800 text-yellow-300" title="Locked until 10 seen">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 016 0v3H9z"/></svg>
                Locked
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {count >= 10 ? (
            <form action={saveList}>
              <input type="hidden" name="director" value={director} />
              <input type="hidden" name="count" value={count} />
              <input type="hidden" name="movie_ids" value={ids} />
              <input type="hidden" name="publish" value="1" />
              <button className="px-4 py-2 text-black bg-yellow-500 rounded hover:bg-yellow-400" type="submit">Publish List</button>
            </form>
          ) : (
            <form action={saveList}>
              <input type="hidden" name="director" value={director} />
              <input type="hidden" name="count" value={count} />
              <input type="hidden" name="movie_ids" value={ids} />
              <input type="hidden" name="publish" value="1" />
              <button
                type="submit"
                className="px-2 py-2 text-sm text-yellow-300 hover:underline"
                title="Locked under 10 — publish anyway"
              >
                Publish anyway
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {movies.map((m, idx) => (
          <div key={m.id} className="p-2 border rounded bg-gray-900/60 border-yellow-500/20">
            <div className="relative aspect-[2/3] rounded overflow-hidden border border-gray-800 bg-gray-800">
              <div className="absolute z-10 px-3 py-2 text-lg font-bold text-white border rounded-md shadow-sm top-2 left-2 bg-gray-900/80 border-gray-300/50 font-unbounded backdrop-blur-sm">
                {idx + 1}
              </div>
              {m.poster_url ? (
                <Image src={normalizeImageUrl(m.poster_url)} alt={m.title} width={400} height={600} className="object-cover w-full h-full" />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-xs text-gray-600">No Image</div>
              )}
            </div>
            <div className="mt-2 text-sm font-medium line-clamp-2">{m.title}</div>
            <div className="text-xs text-gray-500">{m.release_year ?? ''}</div>
          </div>
        ))}
      </div>

      <div>
        <Link href="/lists/ready-made" className="text-sm text-yellow-300 hover:underline">← Back to Ready‑Made</Link>
      </div>
    </div>
  );
}
