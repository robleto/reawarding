"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { supabase } from "@/lib/supabaseBrowser";
import type { Movie } from "@/types/types";

type Props = {
  className?: string;
};

export default function NavSearch({ className = "" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [term, setTerm] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-collapse when route changes
  useEffect(() => {
    setExpanded(false);
    setShowSuggestions(false);
    setTerm("");
  }, [pathname]);

  const doSearch = async (value: string) => {
    if (!value) {
      setSuggestions([]);
      return;
    }
    const { data, error } = await supabase
      .from("movies")
      .select("id, title, release_year, thumb_url, poster_url")
      .ilike("title", `%${value}%`)
      .limit(7);
    if (!error) setSuggestions((data || []) as Movie[]);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTerm(value);
    setShowSuggestions(!!value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => doSearch(value), 200);
  };

  const onSelectMovie = (movie: Movie) => {
    setShowSuggestions(false);
    setExpanded(false);
    setTerm("");
    // Navigate to films with movie filter query param
    router.push(`/films?movie=${movie.id}`);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestions[0]) {
      onSelectMovie(suggestions[0]);
    } else if (term.trim()) {
      // Fallback: go to films and let page search UI handle it via URL param
      router.push(`/films?query=${encodeURIComponent(term.trim())}`);
    }
  };

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => {
        if (!term) {
          setExpanded(false);
          setShowSuggestions(false);
        }
      }}
    >
      <form
        onSubmit={onSubmit}
        className={`flex items-center gap-2 transition-all duration-300 rounded-lg border border-gray-300/60 dark:border-gray-600/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md shadow-sm px-2 ${
          expanded ? "w-64 sm:w-80" : "w-9"
        } h-9 overflow-hidden`}
        onFocus={() => setExpanded(true)}
      >
        <Search className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search movies..."
          value={term}
          onChange={onChange}
          onFocus={() => setShowSuggestions(!!term)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          className={`bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none ${
            expanded ? "w-full opacity-100" : "w-0 opacity-0"
          } transition-all duration-200`}
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
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute left-0 mt-2 w-72 sm:w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[60] max-h-72 overflow-y-auto">
          {suggestions.map((m) => (
            <li
              key={m.id}
              className="px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 border-b last:border-b-0 border-gray-100 dark:border-gray-800"
              onMouseDown={() => onSelectMovie(m)}
            >
              <div className="flex items-center gap-3">
                {m.thumb_url || m.poster_url ? (
                  <img
                    src={(m.thumb_url || m.poster_url) as string}
                    alt={m.title}
                    className="w-10 h-14 object-cover rounded border border-gray-200 dark:border-gray-700 bg-gray-200 dark:bg-gray-800"
                  />
                ) : (
                  <div className="w-10 h-14 rounded bg-gray-200 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />)
                }
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.title}</div>
                  <div className="text-xs text-gray-500">{m.release_year}</div>
                </div>
              </div>
            </li>
          ))}
          <li className="px-3 py-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
            Can’t find it? <a href="/help/add-movie" className="text-blue-600 underline">Learn how to add</a>
          </li>
        </ul>
      )}
    </div>
  );
}
