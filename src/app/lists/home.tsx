"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import Loader from "@/components/ui/Loading";
import ScreenState from "@/components/ui/ScreenState";
import ListCard from "@/components/list/ListCard";
import ListExpandOverlay from "@/components/list/ListExpandOverlay";
import ListsEmptyState from "@/components/lists/ListsEmptyState";
import AuthModalManager from "@/components/auth/AuthModalManager";
import Link from "next/link";
import { ArrowRight, Plus, X } from "lucide-react";
import { useAuthState } from "@/hooks/useAuthState";
import { enrichListsWithCountsAndPosters } from "@/lib/listEnrichment";

// Public lists are unbounded (every public list from every user) — cap the
// initial load rather than fetching the whole table on every page view.
// PERF-2 — docs/audits/2026-08-21-launch-readiness.md.
const PUBLIC_LISTS_LIMIT = 50;

// Same small pill the home page uses for its "Ready-made lists" nudge
// (src/app/page.tsx) — Ready-Made isn't a peer of My/Public here, it's a
// separate feature this page just links out to, so it gets a persistent
// low-key link rather than its own tab or a big banner.
function ReadyMadePill() {
  return (
    <Link
      href="/lists/ready-made"
      className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/30 bg-gold-500/[0.06] px-3 py-1.5 font-unbounded text-xs font-semibold text-gold-300 hover:border-gold-500/50 hover:bg-gold-500/[0.12] transition-colors"
    >
      Ready-made lists
      <ArrowRight className="w-3 h-3" aria-hidden="true" />
    </Link>
  );
}

type ListsFilter = "mine" | "public";

export default function ListsHomePage() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const { status } = useAuthState();
  const userId = user?.id;
  const router = useRouter();
  const [myLists, setMyLists] = useState<any[]>([]);
  const [publicLists, setPublicLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createIsPublic, setCreateIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ListsFilter>("mine");
  const [expandedListIndex, setExpandedListIndex] = useState<number | null>(null);
  const carouselRowRef = useRef<HTMLDivElement | null>(null);
  const [focusedCardIndex, setFocusedCardIndex] = useState(0);

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
          my = await enrichListsWithCountsAndPosters(supabase, listsData);
        }
      }

      // Get public lists
      const { data: pubData, error: pubError } = await supabase
        .from("movie_lists")
        .select("*")
        .eq("is_public", true)
        .order("updated_at", { ascending: false })
        .limit(PUBLIC_LISTS_LIMIT);

      if (pubError) {
        setError("Couldn't load lists right now.");
        setLoading(false);
        return;
      }

      if (pubData) {
        pub = await enrichListsWithCountsAndPosters(supabase, pubData);
      }
      
      setMyLists(my);
      setPublicLists(pub);
      setLoading(false);
    }
    fetchLists();
  }, [status, userId, supabase]);

  const hasAnyLists = myLists.length > 0 || publicLists.length > 0;

  const filteredEntries = activeFilter === "mine" ? myLists : publicLists;

  // Which card is centered in the carousel — measured directly (each card's
  // rendered center vs. the row's center) rather than guessed from scroll
  // position, so it stays correct regardless of card width/gap. Drives the
  // "focus" effect: the centered card is full color and slightly enlarged,
  // neighbors are greyed out and slightly shrunk.
  useEffect(() => {
    const row = carouselRowRef.current;
    if (!row) return;
    let raf = 0;
    const updateFocusedCard = () => {
      const cards = Array.from(row.children) as HTMLElement[];
      if (cards.length === 0) return;
      const rowRect = row.getBoundingClientRect();
      const rowCenter = rowRect.left + rowRect.width / 2;
      let closestIndex = 0;
      let closestDistance = Infinity;
      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const distance = Math.abs(cardCenter - rowCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });
      setFocusedCardIndex(closestIndex);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateFocusedCard);
    };
    updateFocusedCard();
    row.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      row.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [activeFilter, filteredEntries.length]);

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
    // Explicit viewport-based height rather than chaining flex-1 up through
    // AppShell's <main> — that chain didn't actually propagate in practice.
    // This duplicates AppShell's own <main> padding formula
    // (src/components/layout/AppShell.tsx: pt-[var(--header-height,...)],
    // pb-[calc(6rem+safe-area-bottom)] for authenticated mobile) so it fills
    // exactly what's left below the app header and above the mobile tab bar,
    // independent of how many flex layers sit in between. --header-height is
    // published by HeaderNav.tsx (measured, not guessed) — keep the pb side
    // in sync if the tab bar's own height ever changes similarly.
    <div
      className="max-w-screen-xl flex flex-col min-h-0"
      style={{ height: "calc(100dvh - var(--header-height, calc(5rem + env(safe-area-inset-top))) - (6rem + env(safe-area-inset-bottom)))" }}
    >
      {/* Hero/empty state for not-logged-in or no lists */}
      {!user && <ListsEmptyState onCreateList={() => setShowAuthModal(true)} />}
      {user && !hasAnyLists && (
        <>
          <ListsEmptyState onCreateList={() => setShowCreateModal(true)} />
          <div className="flex justify-center mt-4">
            <ReadyMadePill />
          </div>
        </>
      )}

      {user && hasAnyLists && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-shrink-0 mb-6 flex items-center justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-unbounded uppercase tracking-wide text-white">Lists</h1>
            <button
              type="button"
              onClick={handleCreateListClick}
              aria-label="Create new list"
              className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-gold-300 hover:bg-white/10 hover:text-gold-200 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* My/Public toggle — the only real variety here (Ready-Made is a
              different kind of thing, a persistent link at the bottom below,
              not a peer of these two). */}
          <div className="flex-shrink-0 mb-4 inline-flex self-start rounded-full border border-white/10 bg-white/5 p-0.5">
            {(["mine", "public"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveFilter(key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  activeFilter === key
                    ? "bg-gold-500 text-black"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                {key === "mine" ? "My" : "Public"}
                <span className={`ml-1 font-mono ${activeFilter === key ? "text-black/60" : "text-gray-500"}`}>
                  ({key === "mine" ? myLists.length : publicLists.length})
                </span>
              </button>
            ))}
          </div>

          {filteredEntries.length === 0 ? (
            <div className="flex-1 min-h-0 flex items-center justify-center">
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-6 py-10 text-center">
                <p className="text-gray-300 font-medium mb-1">
                  {activeFilter === "mine" ? "You haven't created any lists yet." : "No public lists yet."}
                </p>
                <p className="text-sm text-gray-500">Try the other tab, or create your own list.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 relative overflow-visible">
              <div
                ref={carouselRowRef}
                className="h-full flex gap-5 overflow-x-auto pb-4 pt-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
                style={{
                  // Symmetric inset matching each card's own width formula
                  // (w-[78vw] max-w-[280px]) — this is what lets the first
                  // and last cards scroll to a truly centered position too,
                  // not just the ones in the middle.
                  paddingLeft: "calc((100% - min(78vw, 280px)) / 2)",
                  paddingRight: "calc((100% - min(78vw, 280px)) / 2)",
                }}
              >
                {filteredEntries.map((list, index) => (
                  <div key={list.id} className="h-full w-[78vw] max-w-[280px] flex-shrink-0 overflow-visible snap-center snap-always">
                    <ListCard list={list} onOpen={() => setExpandedListIndex(index)} fillHeight focused={index === focusedCardIndex} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {expandedListIndex !== null && (
            <ListExpandOverlay
              lists={filteredEntries}
              initialIndex={expandedListIndex}
              onClose={() => setExpandedListIndex(null)}
            />
          )}

          {/* Persistent, low-key entry point to Ready-Made lists — same pill
              as the home page's nudge, always visible here regardless of
              which tab is active. */}
          <div className="flex-shrink-0 flex justify-center pt-4 pb-4">
            <ReadyMadePill />
          </div>
        </div>
      )}

      {/* Create List sheet — portaled to document.body, matching every other
          fixed-position overlay in the app (MovieDetailModal, RankingDropdown's
          mobile picker, etc). Bottom sheet on mobile, centered dialog on
          desktop, both using the same glass/pill language as the rest of
          the native Lists redesign. */}
      {showCreateModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <button
            type="button"
            aria-label="Close"
            onClick={resetCreateForm}
            className="absolute inset-0 bg-black/60"
          />
          <div className="relative w-full sm:max-w-md sm:mx-4 bg-charcoal-900 border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl pb-[env(safe-area-inset-bottom)]">
            <div className="sm:hidden mx-auto mt-3 h-1 w-9 rounded-full bg-white/20" />
            <form onSubmit={handleCreateList}>
              <div className="px-6 pt-4 pb-2 sm:pt-6 flex items-center justify-between">
                <h2 className="text-lg font-unbounded uppercase tracking-wide text-white">New List</h2>
                <button
                  type="button"
                  onClick={resetCreateForm}
                  className="flex items-center justify-center w-8 h-8 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 pb-6 space-y-4">
                <div>
                  <label htmlFor="listName" className="block mb-1.5 text-xs font-mono uppercase tracking-wider text-gray-500">
                    List name
                  </label>
                  <input
                    type="text"
                    id="listName"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="My Favorite Movies"
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="listDescription" className="block mb-1.5 text-xs font-mono uppercase tracking-wider text-gray-500">
                    Description
                  </label>
                  <textarea
                    id="listDescription"
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder="A brief description of your list..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent resize-none"
                  />
                </div>

                <label htmlFor="isPublic" className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={createIsPublic}
                    onChange={(e) => setCreateIsPublic(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-gold-500 focus:ring-gold-500/50 focus:ring-offset-0"
                  />
                  <span className="text-sm text-gray-300">Make this list public</span>
                </label>
              </div>

              <div className="px-6 pb-6 flex gap-3">
                <button
                  type="button"
                  onClick={resetCreateForm}
                  className="flex-1 px-4 py-3 rounded-full border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !createName.trim()}
                  className="flex-1 px-4 py-3 rounded-full bg-gold-500 text-black font-semibold hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {creating ? "Creating…" : "Create list"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
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
