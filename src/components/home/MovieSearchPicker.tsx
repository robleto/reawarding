"use client";

import React, { useRef, useState, useCallback } from "react";
import { Search, X, Plus, Loader2 } from "lucide-react";
import type { Movie } from "@/types/types";

type RemoteHit = {
  tmdbId: number;
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
};

interface Props {
  onSelect: (movie: Movie) => void;
  filterByYear?: number;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
  /** When set, pre-fills the search and triggers a lookup */
  suggestedQuery?: string;
  /**
   * "hero"  — gold border + gold icon + focus glow. Use for the primary
   *           search surface on the homepage.
   * "default" — standard gray treatment (existing behaviour).
   */
  variant?: "default" | "hero";
}

/**
 * MovieSearchPicker — inline, always-visible search component.
 * Extracts search logic from NavSearch.tsx but returns onSelect(movie)
 * instead of navigating.
 */
export default function MovieSearchPicker({
  onSelect,
  filterByYear,
  autoFocus = false,
  placeholder = "Search for a movie...",
  className = "",
  suggestedQuery,
  variant = "default",
}: Props) {
  const [term, setTerm] = useState("");
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [remoteSuggestions, setRemoteSuggestions] = useState<RemoteHit[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [importingTmdbId, setImportingTmdbId] = useState<number | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const doSearch = useCallback(
    async (value: string) => {
      if (!value.trim()) {
        setSuggestions([]);
        setRemoteSuggestions([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setImportError(null);

      try {
        const res = await fetch("/api/movies/search-live", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: value, year: filterByYear }),
        });
        const data = await res.json();
        if (res.ok) {
          setSuggestions((data.local || []) as Movie[]);
          setRemoteSuggestions((data.remote || []) as RemoteHit[]);
        }
      } catch {
        // leave prior suggestions in place on transient network errors
      }
      setIsSearching(false);
    },
    [filterByYear]
  );

  // When parent injects a suggested query, pre-fill and search
  React.useEffect(() => {
    if (!suggestedQuery) return;
    setTerm(suggestedQuery);
    setShowSuggestions(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => doSearch(suggestedQuery), 0);
    inputRef.current?.focus();
  }, [suggestedQuery, doSearch]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTerm(value);
    setShowSuggestions(!!value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => doSearch(value), 200);
  };

  const handleSelect = (movie: Movie) => {
    setShowSuggestions(false);
    setTerm("");
    setSuggestions([]);
    setRemoteSuggestions([]);
    onSelect(movie);
  };

  const handleSelectRemote = async (hit: RemoteHit) => {
    setImportingTmdbId(hit.tmdbId);
    setImportError(null);
    try {
      const res = await fetch("/api/movies/import-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: hit.tmdbId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportError(data?.error || "Couldn't add that film. Try again.");
        setImportingTmdbId(null);
        return;
      }
      handleSelect({ ...data.movie, rankings: [] } as Movie);
    } catch {
      setImportError("Couldn't add that film. Try again.");
      setImportingTmdbId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestions[0]) {
      handleSelect(suggestions[0]);
    }
  };

  const isHero = variant === "hero";

  // Container styles — hero variant owns its own elevated, gold-accented shell.
  // Level 2 surface: gradient background sits visibly above the Level 1 card.
  // Glow replaces border-only treatment — perceived light, not just lines.
  const containerClasses = isHero
    ? [
        "flex items-center gap-3 rounded-xl border px-4 h-14 transition-all duration-200",
        "bg-gradient-to-b from-gray-900 to-gray-950",
        isFocused
          ? "border-gold-500/70 shadow-[0_0_0_3px_rgba(212,175,55,0.30),_0_0_20px_rgba(212,175,55,0.15),_0_4px_24px_var(--shadow-ink-strong)]"
          : "border-gold-500/45 shadow-[0_0_0_1px_rgba(212,175,55,0.20),_0_0_12px_rgba(212,175,55,0.08),_0_4px_20px_var(--shadow-ink)]",
      ].join(" ")
    : "flex items-center gap-2 rounded-xl border border-gray-600/60 bg-charcoal-900/80 backdrop-blur-md shadow-sm px-4 h-12";

  const iconClasses = isHero
    ? "w-5 h-5 flex-shrink-0 text-gold-500"
    : "w-5 h-5 text-gray-500 flex-shrink-0";

  const inputClasses = isHero
    ? "bg-transparent text-base text-gray-100 placeholder-gray-400 focus:outline-none w-full h-full self-stretch"
    : "bg-transparent text-base text-gray-200 placeholder-gray-400 focus:outline-none w-full h-full self-stretch";

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className={containerClasses}>
          <Search className={iconClasses} />
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={term}
            onChange={onChange}
            onFocus={() => { setIsFocused(true); setShowSuggestions(!!term); }}
            onBlur={() => { setIsFocused(false); setTimeout(() => setShowSuggestions(false), 200); }}
            autoFocus={autoFocus}
            className={inputClasses}
          />
          {term && (
            <button
              type="button"
              onClick={() => {
                setTerm("");
                setSuggestions([]);
                inputRef.current?.focus();
              }}
              className="p-2 rounded hover:bg-gray-800"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </form>

      {showSuggestions &&
        (suggestions.length > 0 ||
          remoteSuggestions.length > 0 ||
          (term && !isSearching)) && (
        <ul className="movie-search-picker__menu absolute left-0 right-0 mt-2 bg-charcoal-900 border border-gray-700 rounded-xl shadow-lg z-[60] max-h-80 overflow-y-auto">
          {suggestions.map((m) => (
            <li
              key={m.id}
              className="px-3 py-2.5 cursor-pointer hover:bg-gray-800 border-b last:border-b-0 border-gray-800"
              onPointerDown={() => handleSelect(m)}
            >
              <div className="flex items-center gap-3">
                {m.thumb_url || m.poster_url ? (
                  <img
                    src={(m.thumb_url || m.poster_url) as string}
                    alt={m.title}
                    className="w-10 h-14 object-cover rounded border border-gray-700 bg-gray-800"
                  />
                ) : (
                  <div className="w-10 h-14 rounded bg-gray-800 border border-gray-700" />
                )}
                <div>
                  <div className="text-sm font-medium text-gray-100">
                    {m.title}
                  </div>
                  <div className="text-xs text-gray-500">{m.release_year}</div>
                </div>
              </div>
            </li>
          ))}

          {remoteSuggestions.length > 0 && (
            <>
              <li className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-gray-500 bg-gray-800/60">
                Not in your library yet
              </li>
              {remoteSuggestions.map((hit) => {
                const isImporting = importingTmdbId === hit.tmdbId;
                return (
                  <li
                    key={`tmdb-${hit.tmdbId}`}
                    className="px-3 py-2.5 cursor-pointer hover:bg-gray-800 border-b last:border-b-0 border-gray-800"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      if (!isImporting) void handleSelectRemote(hit);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {hit.posterUrl ? (
                        <img
                          src={hit.posterUrl}
                          alt={hit.title}
                          className="w-10 h-14 object-cover rounded border border-gray-700 bg-gray-800 opacity-80"
                        />
                      ) : (
                        <div className="w-10 h-14 rounded bg-gray-800 border border-gray-700" />
                      )}
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-300">
                          {hit.title}
                        </div>
                        <div className="text-xs text-gray-500">{hit.releaseYear}</div>
                      </div>
                      {isImporting ? (
                        <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />
                      ) : (
                        <Plus className="w-4 h-4 text-gold-500 flex-shrink-0" />
                      )}
                    </div>
                  </li>
                );
              })}
            </>
          )}

          {suggestions.length === 0 &&
            remoteSuggestions.length === 0 &&
            term &&
            !isSearching && (
              <li className="px-3 py-3 text-sm text-gray-500 text-center">
                {importError || <>No movies found for &ldquo;{term}&rdquo;</>}
              </li>
            )}

          {importError && (suggestions.length > 0 || remoteSuggestions.length > 0) && (
            <li className="px-3 py-2 text-xs text-red-400 bg-gray-800">{importError}</li>
          )}
        </ul>
      )}
    </div>
  );
}
