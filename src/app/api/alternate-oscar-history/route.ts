import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { isPremiumUser } from "@/lib/premium";
import { toNormalizedAward } from "@/utils/normalizeUserAward";
import { computeAlternateOscarHistory } from "@/utils/alternateOscarHistory";
import type { OfficialAwardWinner } from "@/utils/academyStatus";
import type { Movie } from "@/types/types";

/**
 * GET /api/alternate-oscar-history — server-gated aggregate for the
 * homepage's "Your Alternate Oscar History" panel (PAY-2 —
 * docs/audits/2026-08-21-launch-readiness.md). This used to be computed
 * entirely client-side from the full `movies` prop and only CSS-blurred for
 * non-premium users, so the real upheldRate/byDecade/mostControversial
 * values (including specific movie titles and ratings) were present in the
 * DOM and React state for anyone who opened devtools. Now the full rollup is
 * always computed server-side (cheap — scoped to one user's own rows, not
 * the catalog) but only ever returned for a premium account; a non-premium
 * caller gets `{ locked: true, hasEligibleYears }` — just enough to decide
 * whether to show a locked teaser at all, matching the pre-PAY-2 behavior of
 * hiding the whole panel until there's at least one eligible year, without
 * exposing any specific rating/title/decade breakdown.
 *
 * Deliberately does NOT import src/data/officialAwardWinners.ts's
 * fetchOfficialAwardWinners — that module uses the browser-only Supabase
 * client (src/lib/supabaseBrowser.ts), which is explicitly documented as
 * unsafe in Route Handlers. The (small, public, read-only) winners query is
 * inlined below using this route's own request-scoped server client.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const [premium, { data: awardRows, error: awardsError }] = await Promise.all([
    isPremiumUser(supabase, user.id),
    supabase
      .from("awards")
      .select("year, category, winner_id, nominee_ids")
      .eq("user_id", user.id)
      .eq("category", "best-picture")
      .order("year", { ascending: false }),
  ]);

  if (awardsError) {
    console.error("alternate-oscar-history: failed to fetch awards:", awardsError.message);
    return NextResponse.json({ error: "Failed to load your awards" }, { status: 500 });
  }

  const awards = (awardRows ?? [])
    .map(toNormalizedAward)
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  const emptyHistory = {
    eligibleYears: 0,
    upheld: 0,
    reawardedMild: 0,
    reawardedLoud: 0,
    unscreened: 0,
    upheldRate: null,
    byDecade: [],
    mostControversial: [],
  };

  if (awards.length === 0) {
    return premium
      ? NextResponse.json({ locked: false, history: emptyHistory })
      : NextResponse.json({ locked: true, hasEligibleYears: false });
  }

  const [{ data: rankingRows, error: rankingsError }, { data: winnerRows, error: winnersError }] =
    await Promise.all([
      supabase
        .from("rankings")
        .select("ranking, movie:movies(id, title, poster_url, thumb_url, release_year)")
        .eq("user_id", user.id)
        .not("ranking", "is", null),
      supabase
        .from("official_award_winners")
        .select("year, category, film_title, movie_id, match_status")
        .eq("category", "best-picture"),
    ]);

  if (rankingsError || winnersError) {
    console.error(
      "alternate-oscar-history: failed to fetch movies/winners:",
      rankingsError?.message,
      winnersError?.message
    );
    return NextResponse.json({ error: "Failed to load your ratings" }, { status: 500 });
  }

  const movies: Movie[] = (rankingRows ?? []).flatMap((row: any) => {
    const mv = Array.isArray(row.movie) ? row.movie[0] : row.movie;
    if (!mv) return [];
    return [
      {
        id: mv.id,
        title: mv.title,
        poster_url: mv.poster_url,
        thumb_url: mv.thumb_url ?? mv.poster_url,
        release_year: mv.release_year,
        created_at: "",
        rankings: [{ ranking: row.ranking as number, seen_it: true, user_id: user.id }],
      } satisfies Movie,
    ];
  });

  const winners = new Map<number, OfficialAwardWinner>();
  for (const row of winnerRows ?? []) {
    winners.set(row.year, {
      year: row.year,
      category: row.category,
      filmTitle: row.film_title,
      movieId: row.movie_id,
      matchStatus: row.match_status as OfficialAwardWinner["matchStatus"],
    });
  }

  const history = computeAlternateOscarHistory(movies, awards, winners);

  if (!premium) {
    return NextResponse.json({ locked: true, hasEligibleYears: history.eligibleYears > 0 });
  }

  return NextResponse.json({ locked: false, history });
}
