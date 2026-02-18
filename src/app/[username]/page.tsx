"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Trophy,
  ArrowRight,
  Calendar,
  Clock,
  Clapperboard,
  Sparkles,
  X,
  Film,
  RotateCcw,
  Plus,
  Pencil,
  Check,
} from "lucide-react";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useUser } from "@/hooks/useUser";
import { useEnsureProfile } from "@/hooks/useEnsureProfile";
import { normalizeImageUrl } from "@/utils/imageUrl";
import AwardCard from "@/components/home/AwardCard";
import type { Movie } from "@/types/types";

// ─── Constants ──────────────────────────────────────────
const MAX_PICKS = 5;
const STORAGE_KEY_PREFIX = "reawarding_signature_picks_";

// ─── Helpers ────────────────────────────────────────────
function getDefaultPicks(movies: Movie[]): number[] {
  return movies
    .filter((m) => {
      const r = m.rankings?.[0]?.ranking;
      return typeof r === "number" && r >= 1;
    })
    .sort((a, b) => {
      const ra = a.rankings?.[0]?.ranking ?? 0;
      const rb = b.rankings?.[0]?.ranking ?? 0;
      if (rb !== ra) return rb - ra;
      return (a.title ?? "").localeCompare(b.title ?? "");
    })
    .slice(0, MAX_PICKS)
    .map((m) => m.id);
}

function loadSavedPicks(userId: string): number[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === "number")) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function savePicks(userId: string, picks: number[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(picks));
  } catch {
    // ignore
  }
}

function clearSavedPicks(userId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${userId}`);
  } catch {
    // ignore
  }
}

// ─── Signature Picks ────────────────────────────────────
// Editable shortlist of 4-5 signature films that define the user's taste.
// Owner can add/remove/reset. Public sees read-only.
function SignaturePicks({
  movies,
  username,
  isOwner,
  ownerUserId,
}: {
  movies: Movie[];
  username: string;
  isOwner: boolean;
  ownerUserId: string | null;
}) {
  const defaultPickIds = useMemo(() => getDefaultPicks(movies), [movies]);

  // Load from localStorage if owner, otherwise use defaults
  const [pickIds, setPickIds] = useState<number[]>([]);
  const [isCustomized, setIsCustomized] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showCandidatePool, setShowCandidatePool] = useState(false);

  // Initialize picks
  useEffect(() => {
    if (!ownerUserId) {
      setPickIds(defaultPickIds);
      setIsCustomized(false);
      return;
    }

    const saved = loadSavedPicks(ownerUserId);
    if (saved) {
      // Validate saved IDs still exist in movies
      const movieIdSet = new Set(movies.map((m) => m.id));
      const validSaved = saved.filter((id) => movieIdSet.has(id));
      if (validSaved.length > 0) {
        setPickIds(validSaved);
        setIsCustomized(true);
        return;
      }
    }
    setPickIds(defaultPickIds);
    setIsCustomized(false);
  }, [ownerUserId, movies, defaultPickIds]);

  const movieMap = useMemo(() => {
    const map = new Map<number, Movie>();
    for (const m of movies) map.set(m.id, m);
    return map;
  }, [movies]);

  const pickedMovies = useMemo(
    () => pickIds.map((id) => movieMap.get(id)).filter(Boolean) as Movie[],
    [pickIds, movieMap]
  );

  // Candidate pool: rated ≥ 8, not already picked
  const candidates = useMemo(() => {
    const pickSet = new Set(pickIds);
    return movies
      .filter((m) => {
        const r = m.rankings?.[0]?.ranking;
        return typeof r === "number" && r >= 8 && !pickSet.has(m.id);
      })
      .sort((a, b) => {
        const ra = a.rankings?.[0]?.ranking ?? 0;
        const rb = b.rankings?.[0]?.ranking ?? 0;
        if (rb !== ra) return rb - ra;
        return (a.title ?? "").localeCompare(b.title ?? "");
      })
      .slice(0, 12);
  }, [movies, pickIds]);

  const handleRemovePick = useCallback(
    (movieId: number) => {
      setPickIds((prev) => {
        const next = prev.filter((id) => id !== movieId);
        if (ownerUserId) savePicks(ownerUserId, next);
        setIsCustomized(true);
        return next;
      });
    },
    [ownerUserId]
  );

  const handleAddPick = useCallback(
    (movieId: number) => {
      setPickIds((prev) => {
        if (prev.length >= MAX_PICKS) return prev;
        if (prev.includes(movieId)) return prev;
        const next = [...prev, movieId];
        if (ownerUserId) savePicks(ownerUserId, next);
        setIsCustomized(true);
        return next;
      });
    },
    [ownerUserId]
  );

  const handleReset = useCallback(() => {
    setPickIds(defaultPickIds);
    setIsCustomized(false);
    if (ownerUserId) clearSavedPicks(ownerUserId);
  }, [defaultPickIds, ownerUserId]);

  // Empty slots count
  const emptySlots = Math.max(0, MAX_PICKS - pickedMovies.length);

  // Rated movie count (for empty state)
  const ratedCount = movies.filter(
    (m) => typeof m.rankings?.[0]?.ranking === "number" && m.rankings[0].ranking >= 1
  ).length;

  // ─── Empty state: not enough rated films ───
  if (ratedCount === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-white mb-1">Signature Picks</h2>
        <p className="text-xs text-gray-500 mb-4">Films that define their taste</p>
        <div className="rounded-xl border border-dashed border-gray-700/60 bg-gray-800/20 p-8 text-center">
          <Sparkles className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            {isOwner
              ? "Rate some films to populate your Signature Picks."
              : `@${username} hasn\u2019t rated any films yet.`}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Signature Picks</h2>
          <p className="text-xs text-gray-500">
            {isOwner
              ? isEditing
                ? "Tap posters to remove \u00b7 pick from below to add"
                : "Your defining films"
              : "Films that define their taste"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && isEditing && isCustomized && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-yellow-300 transition-colors"
              title="Reset to auto-picks"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => {
                setIsEditing((v) => {
                  if (!v) setShowCandidatePool(true);
                  return !v;
                });
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${
                isEditing
                  ? "text-green-400 bg-green-500/10 border-green-500/30 hover:bg-green-500/20"
                  : "text-gray-400 bg-gray-800/40 border-gray-700/30 hover:text-white hover:bg-gray-700/60 hover:border-gray-600/50"
              }`}
            >
              {isEditing ? (
                <>
                  <Check className="w-3 h-3" />
                  Done
                </>
              ) : (
                <>
                  <Pencil className="w-3 h-3" />
                  Edit
                </>
              )}
            </button>
          )}
          {!isEditing && (
            <Link
              href={`/${username}/rankings`}
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-yellow-300 transition-colors"
            >
              All rankings <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      {/* Pick Slots */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {/* Filled slots */}
        {pickedMovies.map((movie) => {
          const posterSrc = normalizeImageUrl(movie.poster_url);
          const hasValid = posterSrc && posterSrc.startsWith("http");
          const ranking = movie.rankings?.[0]?.ranking;

          return (
            <div key={movie.id} className="group relative">
              <div className={`aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 border transition-colors ${
                isEditing
                  ? "border-yellow-500/30 ring-1 ring-yellow-500/10"
                  : "border-gray-700/30 group-hover:border-yellow-500/40"
              }`}>
                {hasValid ? (
                  <Image
                    src={posterSrc!}
                    alt={movie.title}
                    width={160}
                    height={240}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <Clapperboard className="w-6 h-6" />
                  </div>
                )}

                {/* Rating badge */}
                {typeof ranking === "number" && (
                  <div className="absolute top-1.5 right-1.5">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold bg-yellow-500/90 text-black shadow-sm">
                      {ranking}
                    </span>
                  </div>
                )}

                {/* Remove button — owner only, always visible in edit mode */}
                {isOwner && isEditing && (
                  <button
                    onClick={() => handleRemovePick(movie.id)}
                    className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-red-900/80 border border-red-500/50 flex items-center justify-center transition-all hover:bg-red-800 hover:scale-110 animate-in fade-in"
                    title="Remove from Signature Picks"
                  >
                    <X className="w-3 h-3 text-red-200" />
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-gray-300 leading-tight line-clamp-2 group-hover:text-white transition-colors">
                {movie.title}
              </p>
            </div>
          );
        })}

        {/* Empty slots — visible in edit mode for owner, subtle placeholders for public */}
        {isOwner && isEditing &&
          Array.from({ length: emptySlots }).map((_, i) => (
            <button
              key={`empty-${i}`}
              onClick={() => setShowCandidatePool(true)}
              className="group"
            >
              <div className="aspect-[2/3] rounded-lg border-2 border-dashed border-yellow-500/30 bg-yellow-500/5 flex flex-col items-center justify-center gap-1.5 hover:border-yellow-500/50 hover:bg-yellow-500/10 transition-all cursor-pointer">
                <Plus className="w-5 h-5 text-yellow-500/50 group-hover:text-yellow-400 transition-colors" />
                <span className="text-[9px] text-yellow-500/50 group-hover:text-yellow-400/80 transition-colors leading-tight text-center px-1">
                  Add Pick
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-gray-600 leading-tight">&nbsp;</p>
            </button>
          ))}

        {/* Public view — no empty slots shown (cleaner look) */}
      </div>

      {/* Candidate Pool — "On the Bubble" */}
      {isOwner && candidates.length > 0 && (
        <div className="mt-6">
          {/* Toggle header — always visible for owner */}
          <button
            onClick={() => {
              if (!isEditing) setIsEditing(true);
              setShowCandidatePool((v) => !v);
            }}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-3"
          >
            <Plus className={`w-3 h-3 transition-transform ${showCandidatePool && isEditing ? "rotate-45" : ""}`} />
            <span>
              {showCandidatePool && isEditing ? "Hide candidates" : "On the Bubble"} · {candidates.length} contender{candidates.length !== 1 ? "s" : ""}
            </span>
          </button>

          {isEditing && showCandidatePool && (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {candidates.map((movie) => {
                const posterSrc = normalizeImageUrl(movie.poster_url);
                const hasValid = posterSrc && posterSrc.startsWith("http");
                const ranking = movie.rankings?.[0]?.ranking;
                const canAdd = pickIds.length < MAX_PICKS;

                return (
                  <button
                    key={movie.id}
                    onClick={() => canAdd && handleAddPick(movie.id)}
                    disabled={!canAdd}
                    className={`group relative text-left ${
                      canAdd
                        ? "cursor-pointer"
                        : "cursor-not-allowed opacity-50"
                    }`}
                    title={canAdd ? `Add "${movie.title}" to Signature Picks` : "All slots filled"}
                  >
                    <div className="aspect-[2/3] rounded-md overflow-hidden bg-gray-800 border border-gray-700/20 group-hover:border-yellow-500/30 transition-colors">
                      {hasValid ? (
                        <Image
                          src={posterSrc!}
                          alt={movie.title}
                          width={120}
                          height={180}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-70 group-hover:opacity-100"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-700">
                          <Clapperboard className="w-4 h-4" />
                        </div>
                      )}

                      {typeof ranking === "number" && (
                        <div className="absolute top-1 right-1">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold bg-gray-800/80 text-yellow-400 border border-gray-700/40">
                            {ranking}
                          </span>
                        </div>
                      )}

                      {/* Add overlay on hover */}
                      {canAdd && (
                        <div className="absolute inset-0 bg-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Plus className="w-5 h-5 text-yellow-400 drop-shadow-lg" />
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] text-gray-500 leading-tight line-clamp-1 group-hover:text-gray-300 transition-colors">
                      {movie.title}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Awards Gallery Preview ─────────────────────────────
// Shows completed awards (where a winner exists), using AwardCard.
function AwardsGallery({ movies, username }: { movies: Movie[]; username: string }) {
  const router = useRouter();

  const awardYears = useMemo(() => {
    const withRankings = movies.filter(
      (m) => m.rankings?.length > 0 && m.rankings[0].ranking !== null
    );
    const grouped: Record<number, Movie[]> = {};
    for (const m of withRankings) {
      const y = m.release_year;
      if (!grouped[y]) grouped[y] = [];
      grouped[y].push(m);
    }
    return Object.entries(grouped)
      .map(([yearStr, yearMovies]) => {
        const sorted = [...yearMovies].sort(
          (a, b) => (b.rankings![0]?.ranking ?? 0) - (a.rankings![0]?.ranking ?? 0)
        );
        const nominees = sorted
          .filter((m) => (m.rankings![0]?.ranking ?? 0) >= 7)
          .slice(0, 10);
        const winner = nominees.length > 0 ? nominees[0] : sorted[0];
        return { year: Number(yearStr), winner, nominees };
      })
      .filter((d) => d.winner)
      .sort((a, b) => b.year - a.year)
      .slice(0, 8);
  }, [movies]);

  if (awardYears.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Awards Gallery</h2>
          <p className="text-xs text-gray-500">Best Picture winners by year</p>
        </div>
        <Link
          href={`/${username}/awards`}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-yellow-300 transition-colors"
        >
          Full history <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="-mx-4 sm:-mx-0 px-4 sm:px-0">
        <div className="flex gap-3 pb-3 overflow-x-auto snap-x snap-mandatory sm:grid sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 sm:overflow-visible sm:pb-0">
          {awardYears.map((entry) => (
            <div key={entry.year} className="flex-shrink-0 w-[140px] sm:w-auto snap-start">
              <AwardCard
                year={entry.year}
                winnerTitle={entry.winner.title}
                winnerPoster={entry.winner.poster_url}
                nomineeCount={entry.nominees.length}
                onClick={() => router.push(`/${username}/awards`)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Signature Taste Stats ──────────────────────────────
// Curated, editorial stat cards — not raw metrics.
function SignatureTasteStats({ movies }: { movies: Movie[] }) {
  const stats = useMemo(() => {
    const rated = movies.filter(
      (m) => typeof m.rankings?.[0]?.ranking === "number" && m.rankings[0].ranking >= 1
    );

    if (rated.length < 3) return null;

    // Most Rated Decade
    const decadeCounts: Record<string, number> = {};
    for (const m of rated) {
      const decade = `${Math.floor(m.release_year / 10) * 10}s`;
      decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
    }
    const topDecade = Object.entries(decadeCounts).sort((a, b) => b[1] - a[1])[0];

    // Oldest Film Rated 9+
    const classics = rated
      .filter((m) => (m.rankings?.[0]?.ranking ?? 0) >= 9)
      .sort((a, b) => a.release_year - b.release_year);
    const oldestClassic = classics[0] ?? null;

    // Favorite Genre (most common in 8+ rated)
    const highRated = rated.filter((m) => (m.rankings?.[0]?.ranking ?? 0) >= 8);
    const genreCounts: Record<string, number> = {};
    for (const m of highRated) {
      const genres: string[] = Array.isArray(m.genres) ? m.genres : [];
      for (const g of genres) {
        if (g) genreCounts[g] = (genreCounts[g] || 0) + 1;
      }
    }
    const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0] ?? null;

    // Average Rating
    const sum = rated.reduce((acc, m) => acc + (m.rankings?.[0]?.ranking ?? 0), 0);
    const avg = sum / rated.length;

    return { topDecade, oldestClassic, topGenre, avg, ratedCount: rated.length };
  }, [movies]);

  if (!stats) return null;

  const cards: { label: string; value: string; sublabel: string; icon: React.ReactNode }[] = [];

  if (stats.topDecade) {
    cards.push({
      label: "Top Decade",
      value: stats.topDecade[0],
      sublabel: `${stats.topDecade[1]} films rated`,
      icon: <Calendar className="w-4 h-4" />,
    });
  }

  if (stats.oldestClassic) {
    cards.push({
      label: "Oldest Classic",
      value: String(stats.oldestClassic.release_year),
      sublabel: stats.oldestClassic.title,
      icon: <Clock className="w-4 h-4" />,
    });
  }

  if (stats.topGenre) {
    cards.push({
      label: "Favorite Genre",
      value: stats.topGenre[0],
      sublabel: `${stats.topGenre[1]} highly rated`,
      icon: <Clapperboard className="w-4 h-4" />,
    });
  }

  cards.push({
    label: "Average Rating",
    value: `${stats.avg.toFixed(1)}`,
    sublabel: `across ${stats.ratedCount} films`,
    icon: <Trophy className="w-4 h-4" />,
  });

  return (
    <section>
      <h2 className="text-lg font-semibold text-white mb-1">Signature Taste</h2>
      <p className="text-xs text-gray-500 mb-4">What the numbers reveal</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.slice(0, 4).map((card) => (
          <div
            key={card.label}
            className="rounded-xl bg-gray-800/30 border border-gray-700/30 p-4 flex flex-col"
          >
            <div className="flex items-center gap-1.5 text-gray-500 mb-2">
              {card.icon}
              <span className="text-[10px] uppercase tracking-wider font-medium">{card.label}</span>
            </div>
            <span className="text-xl font-bold text-white leading-tight">{card.value}</span>
            <span className="text-[11px] text-gray-400 mt-1 leading-tight line-clamp-1">
              {card.sublabel}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Profile Overview Page ──────────────────────────────
export default function ProfileOverviewPage() {
  const { username } = useParams<{ username: string }>();
  const { movies, profile, loading } = usePublicProfile(username);
  const { user } = useUser();
  const { profile: ownerProfile } = useEnsureProfile(user ?? null);

  // Owner detection: logged-in user's profile username matches the route
  const isOwner = !!(
    ownerProfile?.username &&
    profile?.username &&
    ownerProfile.username.toLowerCase() === profile.username.toLowerCase()
  );

  const ownerUserId = isOwner ? profile?.id ?? null : null;

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div>
          <div className="h-5 w-36 bg-gray-700/60 rounded mb-3" />
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-gray-700/40 rounded-lg" />
            ))}
          </div>
        </div>
        <div>
          <div className="h-5 w-40 bg-gray-700/60 rounded mb-3" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-700/40 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <SignaturePicks
        movies={movies}
        username={username}
        isOwner={isOwner}
        ownerUserId={ownerUserId}
      />
      <AwardsGallery movies={movies} username={username} />
      <SignatureTasteStats movies={movies} />
    </div>
  );
}
