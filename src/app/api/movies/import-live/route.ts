import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { importTmdbMovie } from "@/lib/tmdbImport";
import { clientIpFrom, rateLimit } from "@/lib/rateLimit";

/**
 * Narrow, user-triggered import: adds the single TMDB movie the user just
 * picked from live search results (src/components/home/MovieSearchPicker.tsx).
 * Distinct from /api/import-tmdb-movie, which is the admin bulk/arbitrary-ID
 * tool and stays admin-only.
 *
 * **Open to guests, rate limited instead of authenticated.** This used to 401
 * anyone without a session, which made the first step of the logged-out flow a
 * dead end: search-live returns TMDB rows for anything outside the ~4,400-row
 * library, MovieSearchPicker renders them under "Not in your library yet", and
 * tapping one always failed. The visible symptom was the row's `+` flicking to
 * a spinner and back — the error text was there but easy to miss. That breaks
 * the product's actual promise (rate any film you've seen, no account needed),
 * and it breaks it for exactly the visitor whose first film is obscure.
 *
 * Auth is now a *tier*, not a gate, so signed-in users keep the effectively
 * unbounded behaviour they had while guests get a human-sized allowance.
 */

/** Generous for a person picking films out of a dropdown; tight for a script. */
const GUEST_LIMIT = 10;
const USER_LIMIT = 60;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Limit before parsing or importing. A flood of malformed bodies is exactly
  // the traffic this needs to bound, so validation must not come first and let
  // it through for free.
  const scope = user ? `user:${user.id}` : `ip:${clientIpFrom(req)}`;
  const limit = user ? USER_LIMIT : GUEST_LIMIT;
  const { allowed, retryAfterSeconds } = rateLimit(`import-live:${scope}`, limit, WINDOW_MS);
  if (!allowed) {
    // MovieSearchPicker surfaces `error` verbatim in the dropdown, so this
    // string is user-facing copy — say what happened and that it's temporary,
    // never "rate limit exceeded".
    return NextResponse.json(
      { error: "Too many films added just now. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  const { tmdbId } = (await req.json()) as { tmdbId?: number };
  if (!tmdbId || !Number.isInteger(tmdbId) || tmdbId <= 0) {
    return NextResponse.json({ error: "Missing or invalid TMDB ID" }, { status: 400 });
  }

  try {
    const movie = await importTmdbMovie(tmdbId, "live-search");
    return NextResponse.json({ movie });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import failed";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
