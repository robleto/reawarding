"use client";

import React, { useRef, useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import { supabase } from "@/lib/supabaseBrowser";
import type { Movie } from "@/types/types";

interface Props {
  onSelect: (movie: Movie) => void;
  filterByYear?: number;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
  /** When set, pre-fills the search and triggers a lookup */
  suggestedQuery?: string;
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
}: Props) {
  const [term, setTerm] = useState("");
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const doSearch = useCallback(
    async (value: string) => {
      if (!value.trim()) {
        setSuggestions([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      let query = supabase
        .from("movies")
        .select("id, title, release_year, thumb_url, poster_url")
        .ilike("title", `%${value}%`);

      if (filterByYear) {
        query = query.eq("release_year", filterByYear);
      }

      const { data, error } = await query.limit(7);

      if (!error) {
        setSuggestions((data || []) as Movie[]);
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
    onSelect(movie);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestions[0]) {
      handleSelect(suggestions[0]);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2 rounded-xl border border-gray-300/60 dark:border-gray-600/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm px-4 h-12">
          <Search className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={term}
            onChange={onChange}
            onFocus={() => setShowSuggestions(!!term)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            autoFocus={autoFocus}
            className="bg-transparent text-base text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none w-full"
          />
          {term && (
            <button
              type="button"
              onClick={() => {
                setTerm("");
                setSuggestions([]);
                inputRef.current?.focus();
              }}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </form>

      {showSuggestions && (suggestions.length > 0 || (term && !isSearching)) && (
        <ul className="movie-search-picker__menu absolute left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-[60] max-h-80 overflow-y-auto">
          {suggestions.map((m) => (
            <li
              key={m.id}
              className="px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 border-b last:border-b-0 border-gray-100 dark:border-gray-800"
              onMouseDown={() => handleSelect(m)}
            >
              <div className="flex items-center gap-3">
                {m.thumb_url || m.poster_url ? (
                  <img
                    src={(m.thumb_url || m.poster_url) as string}
                    alt={m.title}
                    className="w-10 h-14 object-cover rounded border border-gray-200 dark:border-gray-700 bg-gray-200 dark:bg-gray-800"
                  />
                ) : (
                  <div className="w-10 h-14 rounded bg-gray-200 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
                )}
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {m.title}
                  </div>
                  <div className="text-xs text-gray-500">{m.release_year}</div>
                </div>
              </div>
            </li>
          ))}
          {suggestions.length === 0 && term && !isSearching && (
            <li className="px-3 py-3 text-sm text-gray-500 text-center">
              No movies found for &ldquo;{term}&rdquo;
            </li>
          )}
          <li className="px-3 py-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-b-xl">
            Can&apos;t find it?{" "}
            <a href="/help/add-movie" className="text-blue-600 dark:text-blue-400 underline">
              Add by TMDB ID
            </a>
          </li>
        </ul>
      )}
    </div>
  );
}
