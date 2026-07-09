/**
 * YourTake — the editable expression layer for a film ("the mega-card editor").
 *
 * Lives on the film detail page only: the modal and cards stay pure Viewing
 * surfaces, and quick capture (SeenItButton, RatingModal) stays one-tap. This
 * panel is where a user optionally deepens their take after the loop:
 * private notes, a favorite quote/scene, quality tags, and a would-recommend
 * signal. Backed by the expressions table (one row per user per film).
 *
 * Quality tags are free-form with a small suggestion set — they are the seed
 * vocabulary for future craft-category emergence (a film tagged "great score"
 * is a natural Best Score nominee signal).
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import { PenLine, Plus, X, Check, Lock } from "lucide-react";
import { supabase } from "@/lib/supabaseBrowser";

interface YourTakeProps {
  movieId: string;
}

const SUGGESTED_TAGS = [
  "Gorgeous cinematography",
  "Career-best performance",
  "Great score",
  "Sharp screenplay",
  "Stuck with me for days",
  "Great third act",
];

type SaveState = "idle" | "saving" | "saved" | "error";

export default function YourTake({ movieId }: YourTakeProps) {
  const user = useUser();
  const [loaded, setLoaded] = useState(false);
  const [notes, setNotes] = useState("");
  const [favoriteQuote, setFavoriteQuote] = useState("");
  const [qualityTags, setQualityTags] = useState<string[]>([]);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [tagDraft, setTagDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("expressions")
      .select("notes, favorite_quote, quality_tags, would_recommend")
      .eq("movie_id", movieId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn("Failed to load expression:", error.message);
        } else if (data) {
          setNotes(data.notes ?? "");
          setFavoriteQuote(data.favorite_quote ?? "");
          setQualityTags(Array.isArray(data.quality_tags) ? data.quality_tags : []);
          setWouldRecommend(data.would_recommend ?? null);
        }
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, movieId]);

  const markDirty = () => {
    setDirty(true);
    if (saveState === "saved" || saveState === "error") setSaveState("idle");
  };

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag || qualityTags.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    setQualityTags((prev) => [...prev, tag]);
    setTagDraft("");
    markDirty();
  };

  const removeTag = (tag: string) => {
    setQualityTags((prev) => prev.filter((t) => t !== tag));
    markDirty();
  };

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaveState("saving");
    const { error } = await supabase.from("expressions").upsert(
      {
        user_id: user.id,
        movie_id: movieId,
        notes: notes.trim() || null,
        favorite_quote: favoriteQuote.trim() || null,
        quality_tags: qualityTags,
        would_recommend: wouldRecommend,
      },
      { onConflict: "user_id,movie_id" }
    );
    if (error) {
      console.error("Failed to save expression:", error.message);
      setSaveState("error");
      return;
    }
    setDirty(false);
    setSaveState("saved");
  }, [user, movieId, notes, favoriteQuote, qualityTags, wouldRecommend]);

  // Expression is a logged-in act; guests get the entry panel instead
  if (!user || !loaded) return null;

  const suggestions = SUGGESTED_TAGS.filter(
    (s) => !qualityTags.some((t) => t.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="mb-8 rounded-2xl border border-yellow-500/20 bg-gray-900/80 backdrop-blur-sm shadow-xl overflow-hidden">
      <div className="h-px bg-gradient-to-r from-yellow-500/70 via-yellow-400/30 to-transparent" />
      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-unbounded font-semibold text-yellow-400 flex items-center gap-2">
            <PenLine className="w-5 h-5" />
            Your Take
          </h2>
          <div className="flex items-center gap-3">
            {saveState === "saved" && !dirty && (
              <span className="inline-flex items-center gap-1 text-sm text-green-400">
                <Check className="w-4 h-4" /> Saved
              </span>
            )}
            {saveState === "error" && (
              <span className="text-sm text-red-400">Couldn&rsquo;t save — try again</span>
            )}
            {dirty && (
              <button
                onClick={handleSave}
                disabled={saveState === "saving"}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-yellow-500/90 text-gray-900 hover:bg-yellow-400 transition-colors disabled:opacity-50"
              >
                {saveState === "saving" ? "Saving…" : "Save"}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Notes — private */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-300 mb-1.5">
              Notes
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Lock className="w-3 h-3" /> only you see these
              </span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                markDirty();
              }}
              rows={4}
              placeholder="What did you think?"
              className="w-full rounded-lg bg-gray-800/60 border border-yellow-500/10 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-yellow-500/40 resize-y"
            />
          </div>

          <div className="space-y-5">
            {/* Favorite quote / scene */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Favorite quote or scene
              </label>
              <textarea
                value={favoriteQuote}
                onChange={(e) => {
                  setFavoriteQuote(e.target.value);
                  markDirty();
                }}
                rows={2}
                placeholder="A line or moment worth keeping"
                className="w-full rounded-lg bg-gray-800/60 border border-yellow-500/10 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-yellow-500/40 resize-y"
              />
            </div>

            {/* Would recommend */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Would you recommend it?
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setWouldRecommend(wouldRecommend === true ? null : true);
                    markDirty();
                  }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    wouldRecommend === true
                      ? "bg-green-800/60 text-green-300 border border-green-500/40"
                      : "bg-gray-800/60 text-gray-300 border border-yellow-500/10 hover:bg-gray-700/60"
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => {
                    setWouldRecommend(wouldRecommend === false ? null : false);
                    markDirty();
                  }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    wouldRecommend === false
                      ? "bg-red-900/50 text-red-300 border border-red-500/40"
                      : "bg-gray-800/60 text-gray-300 border border-yellow-500/10 hover:bg-gray-700/60"
                  }`}
                >
                  Not really
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quality tags */}
        <div className="mt-5">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            What stood out?
          </label>
          {qualityTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {qualityTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-yellow-900/40 text-yellow-300 border border-yellow-500/20"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-yellow-100"
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {suggestions.map((tag) => (
                <button
                  key={tag}
                  onClick={() => addTag(tag)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-gray-800/60 text-gray-400 border border-yellow-500/10 hover:text-yellow-300 hover:border-yellow-500/30 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  {tag}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 max-w-sm">
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(tagDraft);
                }
              }}
              placeholder="Add your own…"
              className="flex-1 rounded-lg bg-gray-800/60 border border-yellow-500/10 px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-yellow-500/40"
            />
            <button
              onClick={() => addTag(tagDraft)}
              disabled={!tagDraft.trim()}
              className="px-3 py-1.5 rounded-lg text-sm bg-gray-800/60 border border-yellow-500/10 text-gray-300 hover:text-yellow-300 disabled:opacity-40 transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
