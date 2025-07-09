import React, { useState, useRef } from "react";
import { SORT_OPTIONS, GROUP_OPTIONS } from "@/utils/sharedMovieUtils";
import type { SortKey, GroupKey, SortOrder } from "@/utils/sharedMovieUtils";
import { supabase } from "@/lib/supabaseBrowser";
import type { Movie } from "@/types/types";

interface MovieFiltersProps {
  // View mode controls
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  
  // Sort controls
  sortBy: SortKey;
  setSortBy: (sortBy: SortKey) => void;
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  
  // Group controls
  groupBy: GroupKey;
  setGroupBy: (groupBy: GroupKey) => void;
  
  // Filter controls
  filterType: "none" | "year" | "rank" | "movie";
  setFilterType: (type: "none" | "year" | "rank" | "movie") => void;
  filterValue: string;
  setFilterValue: (value: string) => void;
  
  // Filter options
  uniqueYears: number[];
  uniqueRanks: number[];
}

export default function MovieFilters({
  viewMode,
  setViewMode,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  groupBy,
  setGroupBy,
  filterType,
  setFilterType,
  filterValue,
  setFilterValue,
  uniqueYears,
  uniqueRanks,
}: MovieFiltersProps) {
  // --- Movie search state ---
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch movie suggestions as user types
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSuggestions(!!value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!value) {
      setSuggestions([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      const { data, error } = await supabase
        .from("movies")
        .select("id, title, release_year, poster_url, thumb_url")
        .ilike("title", `%${value}%`)
        .limit(7);
      if (!error && data) setSuggestions(data as Movie[]);
      else setSuggestions([]);
    }, 200);
  };

  // Handle suggestion selection
  const handleSuggestionClick = (movie: Movie) => {
    setSearchTerm(movie.title);
    setShowSuggestions(false);
    setFilterType("movie"); // Use a dedicated filter type for movie search
    setFilterValue(String(movie.id));
  };

  // Clear All handler
  const isDefault =
    filterType === "none" &&
    filterValue === "all" &&
    groupBy === "none" &&
    sortBy === "ranking" &&
    sortOrder === "desc" &&
    viewMode === "grid";

  const handleClearAll = () => {
    setFilterType("none");
    setFilterValue("all");
    setGroupBy("none");
    setSortBy("ranking");
    setSortOrder("desc");
    setViewMode("grid");
    setSearchTerm("");
  };

  return (
    <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-700 dark:text-gray-300">
        {/* Movie Search */}
        <div className="relative z-30">
          <input
            type="text"
            placeholder="Search movies..."
            value={searchTerm}
            onChange={handleSearchChange}
            onFocus={() => setShowSuggestions(!!searchTerm)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-transparent dark:text-gray-300 min-w-[180px]"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-30 left-0 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md mt-1 shadow-lg max-h-56 overflow-y-auto">
              {suggestions.map((movie) => (
                <li
                  key={movie.id}
                  className="px-3 py-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800"
                  onMouseDown={() => handleSuggestionClick(movie)}
                >
                  {movie.title} <span className="text-gray-400 text-xs">({movie.release_year})</span>
                </li>
              ))}
              <li className="px-3 py-2 text-xs text-gray-500 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                Film not here? <a href="/help/add-movie" className="text-blue-600 underline hover:text-blue-800">Learn how to add it.</a>
              </li>
            </ul>
          )}
        </div>
        {/* Group by */}
        <div className="flex items-center gap-2">
          <label htmlFor="group-select" className="dark:text-gray-300">Group by</label>
          <select
            id="group-select"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupKey)}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-transparent dark:text-gray-300"
          >
            {GROUP_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="dark:bg-gray-900 dark:text-white">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort by */}
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="dark:text-gray-300">Sort by</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-transparent dark:text-gray-300"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="dark:bg-gray-900 dark:text-white">
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:bg-transparent dark:hover:bg-gray-800 transition-colors"
            title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
          >
            {sortOrder === "asc" ? "▲" : "▼"}
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2">
          <label htmlFor="filter-type-select" className="dark:text-gray-300">Filter by</label>
          <select
            id="filter-type-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as "none" | "year" | "rank" | "movie")}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-transparent dark:text-gray-300"
          >
            <option value="none" className="dark:bg-gray-900 dark:text-white">None</option>
            <option value="year" className="dark:bg-gray-900 dark:text-white">Year</option>
            <option value="rank" className="dark:bg-gray-900 dark:text-white">Ranking</option>
            {/* Optionally hide 'movie' from manual selection, as it's set by search */}
          </select>

          {filterType === "year" && (
            <select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
            >
              <option value="all" className="dark:bg-gray-900 dark:text-white">All Years</option>
              {uniqueYears.map((year) => (
                <option key={year} value={year} className="dark:bg-gray-900 dark:text-white">
                  {year}
                </option>
              ))}
            </select>
          )}

          {filterType === "rank" && (
            <select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white z-40 relative"
              style={{ zIndex: 40 }}
            >
              <option value="all" className="dark:bg-gray-900 dark:text-white">All Rankings</option>
              {uniqueRanks.map((rank) => (
                <option key={rank} value={rank} className="dark:bg-gray-900 dark:text-white">
                  {rank}
                </option>
              ))}
            </select>
          )}
        </div>
        {/* Clear All Button */}
        {!isDefault && (
          <button
            onClick={handleClearAll}
            className="ml-2 px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-xs"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode("list")}
          className={`p-2 rounded-full border ${
            viewMode === "list"
              ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-600"
              : "text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600"
          } hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}
          aria-label="List view"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <button
          onClick={() => setViewMode("grid")}
          className={`p-2 rounded-full border ${
            viewMode === "grid"
              ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-600"
              : "text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600"
          } hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}
          aria-label="Grid view"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h6v6H4V6zm0 8h6v6H4v-6zm10-8h6v6h-6V6zm0 8h6v6h-6v-6z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
