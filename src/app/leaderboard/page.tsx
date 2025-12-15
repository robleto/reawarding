import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc('get_participation_leaderboard', {
    limit_count: 50,
  });

  const rows: any[] = !error && Array.isArray(data) ? data : [];

  return (
    <main className="max-w-screen-xl px-6 py-10 mx-auto">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-unbounded text-gray-900 dark:text-gray-100">Leaderboard</h1>
        <Link href="/films" className="text-sm text-yellow-300 hover:underline">Browse films</Link>
      </div>

      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Participation score = ranked movies × 2 + lists × 5 + list items × 1
      </p>

      {error && (
        <div className="mt-6 p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-200">
          Failed to load leaderboard.
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-yellow-500/20 bg-gray-900/60">
        <div className="grid grid-cols-12 px-4 py-3 text-xs uppercase tracking-wide text-gray-400 border-b border-yellow-500/10">
          <div className="col-span-1">#</div>
          <div className="col-span-7">User</div>
          <div className="col-span-2 text-right">Score</div>
          <div className="col-span-2 text-right">Rankings</div>
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-300">No leaderboard data yet.</div>
        ) : (
          rows.map((r, i) => {
            const display = r.preferred_name || r.full_name || r.username;
            return (
              <div
                key={r.user_id}
                className="grid grid-cols-12 px-4 py-3 text-sm text-gray-200 border-b border-yellow-500/5 last:border-b-0"
              >
                <div className="col-span-1 text-gray-400">{i + 1}</div>
                <div className="col-span-7 min-w-0">
                  <div className="truncate font-medium">{display}</div>
                  <div className="truncate text-xs text-gray-400">@{r.username}</div>
                </div>
                <div className="col-span-2 text-right font-semibold text-yellow-300">{r.score}</div>
                <div className="col-span-2 text-right text-gray-300">{r.rankings_count}</div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
