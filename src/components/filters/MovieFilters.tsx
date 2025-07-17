import React, { useState, useRef } from "react";
import { SORT_OPTIONS, GROUP_OPTIONS } from "@/utils/sharedMovieUtils";
import type { SortKey, GroupKey, SortOrder } from "@/utils/sharedMovieUtils";
import { supabase } from "@/lib/supabaseBrowser";
import type { Movie } from "@/types/types";
import { Search, Filter, SortAsc, SortDesc, Grid3X3, List, X, ChevronDown } from "lucide-react";

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
  
  // Default values for reset functionality
  defaults?: {
    viewMode?: "grid" | "list";
    sortBy?: SortKey;
    sortOrder?: SortOrder;
    groupBy?: GroupKey;
    filterType?: "none" | "year" | "rank" | "movie";
    filterValue?: string;
  };
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
  defaults = {
    viewMode: "grid",
    sortBy: "ranking",
    sortOrder: "desc",
    groupBy: "none",
    filterType: "none",
    filterValue: "all"
  }
}: MovieFiltersProps) {
  // --- Movie search state ---
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
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
    filterType === (defaults.filterType || "none") &&
    filterValue === (defaults.filterValue || "all") &&
    groupBy === (defaults.groupBy || "none") &&
    sortBy === (defaults.sortBy || "ranking") &&
    sortOrder === (defaults.sortOrder || "desc") &&
    viewMode === (defaults.viewMode || "grid");

  const handleClearAll = () => {
    setFilterType(defaults.filterType || "none");
    setFilterValue(defaults.filterValue || "all");
    setGroupBy(defaults.groupBy || "none");
    setSortBy(defaults.sortBy || "ranking");
    setSortOrder(defaults.sortOrder || "desc");
    setViewMode(defaults.viewMode || "grid");
    setSearchTerm("");
  };

  return (
    <div className="mb-6">
      {/* Main Row - Responsive, Search Expands, Controls Shift */}
      <div className="flex items-center gap-4 mb-4">
        {/* Search Bar: Compact, Expands on Focus/Input */}
        <div className="relative transition-all duration-300" style={{ minWidth: 0 }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search movies..."
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => setShowSuggestions(!!searchTerm)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              className={`pl-10 pr-4 py-2.5 border border-gray-600/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800/50 text-gray-300 placeholder-gray-400 transition-all duration-300
                ${searchTerm.length > 0 || showSuggestions ? 'w-64 sm:w-80 md:w-96' : 'w-28 sm:w-36 md:w-44'}
              `}
              style={{ minWidth: '3.5rem', maxWidth: '24rem' }}
            />
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-30 left-0 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg mt-1 shadow-lg max-h-56 overflow-y-auto">
              {suggestions.map((movie) => (
                <li
                  key={movie.id}
                  className="px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  onMouseDown={() => handleSuggestionClick(movie)}
                >
                  <div className="flex items-center gap-3">
                    {movie.poster_url && (
                      <img
                        src={movie.poster_url}
                        alt={movie.title}
                        className="w-12 h-16 object-cover rounded shadow-sm border border-gray-200 dark:border-gray-700 bg-gray-200 dark:bg-gray-800 flex-shrink-0"
                        loading="lazy"
                      />
                    )}
                    <div>
                      <div className="font-medium text-sm">{movie.title}</div>
                      <div className="text-xs text-gray-500">{movie.release_year}</div>
                    </div>
                  </div>
                </li>
              ))}
              <li className="px-4 py-3 text-xs text-gray-500 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                Can't find your movie? <a href="/help/add-movie" className="text-blue-600 underline hover:text-blue-800">Learn how to add it</a>
              </li>
            </ul>
          )}
        </div>

        {/* Filters/Sort: Always flush left, shift as search expands */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Filters Toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              showAdvancedFilters || filterType !== "none" || groupBy !== "none" || sortBy !== "ranking"
                ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                : "text-gray-400 border-gray-600/50 hover:bg-gray-800/50 bg-gray-800/30"
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Filters</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Sort Toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border text-gray-400 border-gray-600/50 hover:bg-gray-800/50 bg-gray-800/30 transition-colors"
            title={`Currently sorting ${SORT_OPTIONS.find(opt => opt.value === sortBy)?.label} ${sortOrder === "asc" ? "ascending" : "descending"}`}
          >
            {sortOrder === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            <span className="text-sm hidden sm:inline">{SORT_OPTIONS.find(opt => opt.value === sortBy)?.label}</span>
          </button>
      </div>

      {/* Advanced Filters - Collapsible */}
      {showAdvancedFilters && (
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-600/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="w-full border border-gray-600/50 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800/70 text-gray-300"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Group By */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Group by</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupKey)}
                className="w-full border border-gray-600/50 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800/70 text-gray-300"
              >
                {GROUP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter By */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Filter by</label>
              <div className="flex gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as "none" | "year" | "rank" | "movie")}
                  className="flex-1 border border-gray-600/50 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800/70 text-gray-300"
                >
                  <option value="none">None</option>
                  <option value="year">Year</option>
                  <option value="rank">Ranking</option>
                </select>

                {filterType === "year" && (
                  <select
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    className="flex-1 border border-gray-600/50 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800/70 text-gray-300"
                  >
                    <option value="all">All Years</option>
                    {uniqueYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                )}

                {filterType === "rank" && (
                  <select
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    className="flex-1 border border-gray-600/50 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800/70 text-gray-300"
                  >
                    <option value="all">All Rankings</option>
                    {uniqueRanks.map((rank) => (
                      <option key={rank} value={rank}>
                        {rank}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
