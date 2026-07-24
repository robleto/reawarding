"use client";

import { useEffect, useMemo, useState } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import Loader from "@/components/ui/Loading";
import ScreenState from "@/components/ui/ScreenState";
import HorizontalListRow from "@/components/list/HorizontalListRow";
import ListsEmptyState from "@/components/lists/ListsEmptyState";
import AuthModalManager from "@/components/auth/AuthModalManager";
import Link from "next/link";
import { List, X } from "lucide-react";
import { useAuthState } from "@/hooks/useAuthState";
import { useSmartListAlerts } from "@/hooks/useSmartListAlerts";
import { useIsPremium } from "@/hooks/useIsPremium";
import ReadyMadeCard from "@/components/lists/ReadyMadeCard";
import { slugifyTitle } from "@/utils/slug";
import type { Movie } from "@/types/types";

export default function ListsHomePage() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const { status } = useAuthState();
  const userId = user?.id;
  const router = useRouter();
  const [myLists, setMyLists] = useState<any[]>([]);
  const [publicLists, setPublicLists] = useState<any[]>([]);
  const [seenMovies, setSeenMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createIsPublic, setCreateIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readyMadeBannerDismissed, setReadyMadeBannerDismissed] = useState(false);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId || !createName.trim()) return;
    
    setCreating(true);
    
    try {
      const { data, error } = await supabase
        .from("movie_lists")
        .insert({
          user_id: userId,
          name: createName.trim(),
          description: createDescription.trim() || null,
          is_public: createIsPublic,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating list:", error.message);
        return;
      }

      // Navigate to the new list
      router.push(`/lists/${data.id}`);
    } catch (err) {
      console.error("Error creating list:", err);
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setCreateName("");
    setCreateDescription("");
    setCreateIsPublic(false);
    setShowCreateModal(false);
  };

  const handleCreateListClick = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setShowCreateModal(true);
  };

  useEffect(() => {
    // Don't fetch until auth has resolved — avoids a race where userId is
    // undefined on first render and seenMovies never gets populated.
    if (status === "loading") return;

    async function fetchLists() {
      setLoading(true);
      setError(null);
      let my = [];
      let pub = [];
      // previously used to show a Ready‑Made CTA row; no longer needed

      if (userId) {
        // First, get all lists for the current user (exclude E2E test artifacts)
        const { data: listsData, error: listsError } = await supabase
          .from("movie_lists")
          .select("*")
          .eq("user_id", userId)
          .not("name", "ilike", "E2E%")
          .order("updated_at", { ascending: false });

        if (listsError) {
          setError("Couldn't load your lists.");
          setLoading(false);
          return;
        }

        if (listsData) {
          // For each list, get the count of movies and top 5 poster URLs
          const listsWithCountsAndPosters = await Promise.all(
            listsData.map(async (list) => {
              // Get count (avoid head:true to sidestep edge policy issues)
              const { count } = await supabase
                .from("movie_list_items")
                .select("id", { count: "exact" })
                .eq("list_id", list.id)
                .limit(1);

              // Get top 5 movie IDs in order
              const { data: items } = await supabase
                .from("movie_list_items")
                .select("movie_id")
                .eq("list_id", list.id)
                .order("ranking", { ascending: true })
                .limit(5);

              const movieIds = (items || []).map((item) => item.movie_id);
              let posterUrls: string[] = [];
              if (movieIds.length > 0) {
                // Fetch poster URLs for these movies
                const { data: movies } = await supabase
                  .from("movies")
                  .select("id,poster_url")
                  .in("id", movieIds);
                // Preserve order
                posterUrls = movieIds.map((id) => {
                  const m = movies?.find((mm) => mm.id === id);
                  return (m?.poster_url || "") as string;
                });
              }

              return {
                ...list,
                movie_count: count || 0,
                posterUrls,
              };
            })
          );
          my = listsWithCountsAndPosters;
        }

        // Fetch seen movies for smart list detection
        const { data: rankingRows } = await supabase
          .from("rankings")
          .select("movie_id, seen_it, ranking")
          .eq("user_id", userId)
          .eq("seen_it", true);

        const seenIds = (rankingRows || []).map((r: { movie_id: string }) => r.movie_id);
        if (seenIds.length > 0) {
          const { data: movieRows } = await supabase
            .from("movies")
            .select("id, title, poster_url, director, genres, cast_list, release_year")
            .in("id", seenIds);

          if (movieRows) {
            const mapped = movieRows.map((m) => ({
              ...m,
              rankings: [{
                seen_it: true,
                ranking: rankingRows?.find((r: { movie_id: string }) => r.movie_id === m.id)?.ranking ?? null,
              }],
            })) as Movie[];
            setSeenMovies(mapped);
          }
        }
      }
      
      // Get public lists
      const { data: pubData, error: pubError } = await supabase
        .from("movie_lists")
        .select("*")
        .eq("is_public", true)
        .order("updated_at", { ascending: false });
      
      if (pubError) {
        setError("Couldn't load lists right now.");
        setLoading(false);
        return;
      }

      if (pubData) {
        // Add counts and posters for public lists too
        const publicListsWithData = await Promise.all(
          pubData.map(async (list) => {
            const { count } = await supabase
              .from("movie_list_items")
              .select("id", { count: "exact" })
              .eq("list_id", list.id)
              .limit(1);

            const { data: items } = await supabase
              .from("movie_list_items")
              .select("movie_id")
              .eq("list_id", list.id)
              .order("ranking", { ascending: true })
              .limit(5);

            const movieIds = (items || []).map((item) => item.movie_id);
            let posterUrls: string[] = [];
            if (movieIds.length > 0) {
              const { data: movies } = await supabase
                .from("movies")
                .select("id,poster_url")
                .in("id", movieIds);
              posterUrls = movieIds.map((id) => {
                const m = movies?.find((mm) => mm.id === id);
                return (m?.poster_url || "") as string;
              });
            }

            return {
              ...list,
              movie_count: count || 0,
              posterUrls,
            };
          })
        );
        pub = publicListsWithData;
      }
      
      setMyLists(my);
      setPublicLists(pub);
      setLoading(false);
    }
    fetchLists();
  }, [status, userId, supabase]);

  // Smart list alerts derived from seen movies
  const smartAlerts = useSmartListAlerts(seenMovies);
  const isPremium = useIsPremium();
  const [savingAlertKey, setSavingAlertKey] = useState<string | null>(null);
  const [savedAlertKeys, setSavedAlertKeys] = useState<string[]>([]);
  const [dismissedAlertKeys, setDismissedAlertKeys] = useState<string[]>([]);
  const [saveAlertErrors, setSaveAlertErrors] = useState<Record<string, string>>({});

  const handleSaveSmartList = async (alert: { type: string; label: string; movieIds: string[] }) => {
    if (!userId) return;
    const key = `${alert.type}:${alert.label}`;
    setSavingAlertKey(key);
    setSaveAlertErrors((prev) => ({ ...prev, [key]: "" }));
    try {
      const res = await fetch("/api/lists/ready-made/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: alert.type, label: alert.label, movieIds: alert.movieIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save list");
      setSavedAlertKeys((prev) => [...prev, key]);
    } catch (e) {
      console.error("Failed to save smart list:", e);
      setSaveAlertErrors((prev) => ({ ...prev, [key]: e instanceof Error ? e.message : "Failed to save list" }));
    } finally {
      setSavingAlertKey(null);
    }
  };

  // Build poster URL arrays for each smart list alert
  const getPosterUrlsForAlert = useMemo(() => (movieIds: string[]) =>
    movieIds
      .slice(0, 5)
      .map((id) => seenMovies.find((m) => m.id === id))
      .filter((m): m is Movie => Boolean(m))
      .map((m) => (m as { poster_url?: string | null }).poster_url ?? "")
      .filter(Boolean),
  [seenMovies]);

  const visibleSmartAlerts = smartAlerts.filter(
    (a) => !a.nearMiss && !dismissedAlertKeys.includes(`${a.type}:${a.label}`)
  );

  if (loading) return <Loader message="Loading lists..." />;

  if (status === "loading") return <Loader message="Loading lists..." />;

  if (error) {
    return (
      <ScreenState
        testId="screen-state-fetch-failure"
        tone="error"
        title="Couldn't load lists"
        message="This page is staying closed instead of guessing with partial list data."
        primaryAction={{ label: "Back Home", href: "/" }}
      />
    );
  }

  return (
    <div className="max-w-screen-xl">
      {/* Hero/empty state for not-logged-in or no lists */}
      {!user && <ListsEmptyState onCreateList={() => setShowAuthModal(true)} />}
      {user && myLists.length === 0 && publicLists.length === 0 && (
        <>
          <ListsEmptyState onCreateList={() => setShowCreateModal(true)} />
          <div className="p-5 mt-6 border rounded-lg bg-charcoal-900/60 border-gold-500/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gold-200">Ready-Made Lists</h3>
                <p className="text-sm text-gray-300">Pre-built from your ratings — directors, decades, genres and more.</p>
              </div>
              <a href="/lists/ready-made" className="px-3 py-2 text-black bg-gold-500 rounded hover:bg-gold-400">Explore</a>
            </div>
          </div>
        </>
      )}

      {/* Ready-Made Lists fallback banner — sits at the top, above My Lists, so
          it's the first thing seen; only shown when the personalized rail below
          isn't (no qualifying alerts), and can be dismissed for this visit. */}
      {user &&
        visibleSmartAlerts.length === 0 &&
        !(myLists.length === 0 && publicLists.length === 0) &&
        !readyMadeBannerDismissed && (
          <div className="relative p-5 mb-8 border rounded-lg bg-charcoal-900/60 border-gold-500/20">
            <button
              type="button"
              onClick={() => setReadyMadeBannerDismissed(true)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-200 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-between pr-6">
              <div>
                <h3 className="text-lg font-semibold text-gold-200">Ready-Made Lists</h3>
                <p className="text-sm text-gray-300">Pre-built from your ratings — directors, decades, genres and more.</p>
              </div>
              <a href="/lists/ready-made" className="px-3 py-2 text-black bg-gold-500 rounded hover:bg-gold-400">Explore</a>
            </div>
          </div>
        )}

      {/* My Lists — always first, primary */}
      {user && myLists.length > 0 && (
        <HorizontalListRow
          title="My Lists"
          lists={myLists.slice(0, 8)}
          seeAllHref={myLists.length > 3 ? "/lists/mine" : undefined}
          onAdd={handleCreateListClick}
          headerActions={
            <>
              <button
                type="button"
                onClick={handleCreateListClick}
                className="px-3 py-1.5 text-sm font-medium text-black bg-gold-500 rounded hover:bg-gold-400 transition-colors whitespace-nowrap"
              >
                Create New List
              </button>
              <Link
                href="/lists/ready-made"
                className="px-3 py-1.5 text-sm font-medium text-gold-300 border border-gold-500/40 rounded hover:bg-gold-500/10 transition-colors whitespace-nowrap"
              >
                Find Ready-Made List
              </Link>
            </>
          }
        />
      )}

      {/* Public Lists Row */}
      {publicLists.length > 0 && (
        <HorizontalListRow
          title="Public Lists"
          lists={publicLists.slice(0, 8)}
          seeAllHref={publicLists.length > 3 ? "/lists/public" : undefined}
          readOnly
        />
      )}

      {visibleSmartAlerts.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-5 px-1">
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">Ready-Made Lists</h2>
              <p className="text-xs text-gray-500 mt-0.5">Pre-built from your ratings — save any of these in one tap.</p>
            </div>
            <a href="/lists/ready-made" className="text-sm text-gold-400 hover:text-gold-300 transition-colors font-medium">
              See all →
            </a>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {visibleSmartAlerts.slice(0, 6).map((alert) => {
              const alertKey = `${alert.type}:${alert.label}`;
              if (dismissedAlertKeys.includes(alertKey)) return null;
              const posterUrls = getPosterUrlsForAlert(alert.movieIds);
              const typeLabel = alert.type.charAt(0).toUpperCase() + alert.type.slice(1);
              const isSaving = savingAlertKey === alertKey;
              const isSaved = savedAlertKeys.includes(alertKey);
              return (
                <div key={alertKey} className="min-w-[300px] max-w-[300px] flex-shrink-0 snap-start overflow-visible">
                  <ReadyMadeCard
                    title={alert.label}
                    count={alert.count}
                    subtitle={<span>{typeLabel}</span>}
                    posterUrls={posterUrls}
                    viewHref={`/lists/ready-made/${slugifyTitle(alert.label)}`}
                    headerRight={
                      isSaved ? (
                        <span className="px-3 py-1.5 text-sm font-medium text-green-400">Saved ✓</span>
                      ) : !isPremium ? (
                        <Link
                          href="/?upgrade=required"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 bg-gray-800 border border-gray-700 rounded hover:text-gray-300 hover:border-gray-600"
                          title="Saving Ready-Made lists is a premium feature"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 016 0v3H9z"/></svg>
                          Premium
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSaveSmartList(alert)}
                          disabled={isSaving}
                          className="px-3 py-1.5 text-sm bg-gold-500 text-black rounded hover:bg-gold-400 disabled:opacity-50 font-medium"
                        >
                          {isSaving ? "Saving…" : "Save"}
                        </button>
                      )
                    }
                    dismissForm={
                      !isSaved && (
                        <button
                          type="button"
                          onClick={() => setDismissedAlertKeys((prev) => [...prev, alertKey])}
                          className="text-sm text-gray-400 hover:text-gray-300"
                          title="Hide this suggestion"
                        >
                          Dismiss
                        </button>
                      )
                    }
                  />
                  {saveAlertErrors[alertKey] && (
                    <p className="mt-2 text-xs text-red-400">{saveAlertErrors[alertKey]}</p>
                  )}
                </div>
              );
            })}
            {/* Terminator — mirrors the home page rail */}
            <Link
              href="/lists/ready-made"
              className="min-w-[300px] max-w-[300px] h-[260px] mt-5 flex-shrink-0 snap-start flex flex-col items-center justify-center border-2 border-dashed border-gold-500/40 bg-charcoal-900/40 hover:border-gold-500/60 hover:bg-charcoal-900/60 rounded-lg shadow-md transition-all p-6 group"
              aria-label="Browse all ready-made lists"
            >
              <div className="flex items-center justify-center w-16 h-16 mb-2 rounded-full bg-gold-500/20 group-hover:bg-gold-500/40 transition-all">
                <List className="w-7 h-7 text-gold-300" />
              </div>
              <span className="mt-2 text-base font-semibold text-gold-200 group-hover:text-gold-300 transition-colors">Browse all</span>
              <span className="mt-1 text-xs text-gray-300">More from your ratings</span>
            </Link>
          </div>
        </section>
      )}

      {/* Create List Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-black bg-opacity-70">
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg bg-charcoal-900 border-gray-700">
            <form onSubmit={handleCreateList}>
              {/* Header */}
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Create New List</h2>
                  <button
                    type="button"
                    onClick={resetCreateForm}
                    className="text-gray-400 transition-colors text-gray-500 hover:text-gray-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="p-6 space-y-4">
                <div>
                  <label htmlFor="listName" className="block mb-2 text-sm font-medium text-gray-300">
                    List Name *
                  </label>
                  <input
                    type="text"
                    id="listName"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="My Favorite Movies"
                    className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="listDescription" className="block mb-2 text-sm font-medium text-gray-300">
                    Description
                  </label>
                  <textarea
                    id="listDescription"
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder="A brief description of your list..."
                    rows={3}
                    className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-md border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={createIsPublic}
                    onChange={(e) => setCreateIsPublic(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-white border-gray-300 border-gray-600 focus:ring-blue-400 bg-gray-800"
                  />
                  <label htmlFor="isPublic" className="ml-2 text-sm text-gray-300">
                    Make this list public (others can view it)
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 border-gray-700 bg-gray-800/50">
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetCreateForm}
                    className="px-4 py-2 text-gray-700 transition-colors border border-gray-300 text-gray-300 border-gray-600 hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !createName.trim()}
                    className="px-4 py-2 text-white transition-colors bg-blue-600 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? "Creating..." : "Create List"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModalManager
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signup"
        onAuthSuccess={() => setShowAuthModal(false)}
      />
    </div>
  );
}
