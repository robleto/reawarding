import React, { useState, useRef } from "react";
import { SORT_OPTIONS, GROUP_OPTIONS } from "@/utils/sharedMovieUtils";
import type { SortKey, GroupKey, SortOrder } from "@/utils/sharedMovieUtils";
import { supabase } from "@/lib/supabaseBrowser";
import type { Movie } from "@/types/types";
import { Search, Filter, SortAsc, SortDesc, Grid3X3, List, X, ChevronDown, ArrowUpDown } from "lucide-react";

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
  filterType: "none" | "year" | "rank" | "movie" | "search" | "genre";
  setFilterType: (type: "none" | "year" | "rank" | "movie" | "search" | "genre") => void;
  filterValue: string;
  setFilterValue: (value: string) => void;
  
  // Filter options
  uniqueYears: number[];
  uniqueRanks: number[];
  uniqueGenres?: string[];
  
  // Local search mode (search within provided movies instead of querying DB)
  localSearchMode?: boolean;
  availableMovies?: Movie[];
  searchContext?: string; // e.g., "rankings", "watchlist", "this list"
  
  // Default values for reset functionality
  defaults?: {
    viewMode?: "grid" | "list";
    sortBy?: SortKey;
    sortOrder?: SortOrder;
    groupBy?: GroupKey;
    filterType?: "none" | "year" | "rank" | "movie" | "genre";
    filterValue?: string;
  };
  // Always-on contextual filters (e.g. "Seen only" on profile films page)
  persistentFilterLabels?: string[];
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
  uniqueGenres = [],
  localSearchMode = false,
  availableMovies = [],
  searchContext = "this list",
  persistentFilterLabels = [],
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
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch movie suggestions as user types
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSuggestions(!localSearchMode && !!value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!value) {
      setSuggestions([]);
      if (localSearchMode) {
        setFilterType(defaults.filterType || "none");
        setFilterValue(defaults.filterValue || "all");
      }
      return;
    }
    
    if (localSearchMode) {
      // Local search: filter within availableMovies
      const filtered = availableMovies.filter(movie =>
        movie.title.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 7);
      setSuggestions(filtered);
      setFilterType("search");
      setFilterValue(value);
    } else {
      // Global search: query database
      searchTimeout.current = setTimeout(async () => {
        const { data, error } = await supabase
          .from("movies")
          .select("id, title, release_year, poster_url, thumb_url")
          .ilike("title", `%${value}%`)
          .limit(7);
        if (!error && data) setSuggestions(data as Movie[]);
        else setSuggestions([]);
      }, 200);
    }
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

  const removableFilterCount = [
    filterType !== (defaults.filterType || "none") && filterValue !== (defaults.filterValue || "all"),
    groupBy !== (defaults.groupBy || "none"),
    sortBy !== (defaults.sortBy || "ranking") || sortOrder !== (defaults.sortOrder || "desc"),
    viewMode !== (defaults.viewMode || "grid")
  ].filter(Boolean).length;
  const activeFilterCount = removableFilterCount + persistentFilterLabels.length;

  // Active filter pills
  const activeFilters: { label: string; onRemove: () => void }[] = [];
  if (viewMode !== (defaults.viewMode || "grid")) {
    activeFilters.push({ label: `View: ${viewMode === "list" ? "List" : "Grid"}`, onRemove: () => setViewMode(defaults.viewMode || "grid") });
  }
  if (sortBy !== (defaults.sortBy || "ranking") || sortOrder !== (defaults.sortOrder || "desc")) {
    const sortLabel = SORT_OPTIONS.find(opt => opt.value === sortBy)?.label || sortBy;
    activeFilters.push({ 
      label: `Sort: ${sortLabel} ${sortOrder === "asc" ? "↑" : "↓"}`, 
      onRemove: () => { setSortBy(defaults.sortBy || "ranking"); setSortOrder(defaults.sortOrder || "desc"); }
    });
  }
  if (groupBy !== (defaults.groupBy || "none")) {
    const groupLabel = GROUP_OPTIONS.find(opt => opt.value === groupBy)?.label || groupBy;
    activeFilters.push({ label: `Group: ${groupLabel}`, onRemove: () => setGroupBy(defaults.groupBy || "none") });
  }
  if (filterType !== (defaults.filterType || "none") && filterValue !== (defaults.filterValue || "all")) {
    let filterLabel = "";
    if (filterType === "year") filterLabel = `Year: ${filterValue}`;
    else if (filterType === "rank") filterLabel = filterValue === "unranked" ? "Rating: No Rating" : `Rating: ${filterValue}`;
    else if (filterType === "movie") filterLabel = "Movie filter";
    else if (filterType === "search") filterLabel = `Query: ${filterValue}`;
    else if (filterType === "genre") filterLabel = `Genre: ${filterValue}`;
    activeFilters.push({ 
      label: filterLabel, 
      onRemove: () => { setFilterType(defaults.filterType || "none"); setFilterValue(defaults.filterValue || "all"); }
    });
  }

  return (
    <div className="mb-4 sm:mb-6">
      {/* Search Bar and Filters Button Row */}
      <div className="flex gap-3 items-start">
        {/* Search Bar */}
        <div className="relative flex-1" style={{ minWidth: 0 }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder={localSearchMode ? `Search through ${searchContext}...` : "Search movies..."}
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => setShowSuggestions(!localSearchMode && !!searchTerm)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 text-gray-300 placeholder-gray-400 transition-all duration-300 ${
                localSearchMode 
                  ? "border-yellow-500/30 bg-yellow-500/5 focus:ring-yellow-500/50" 
                  : "border-gray-600/50 bg-gray-800/50 focus:ring-blue-500"
              }`}
            />
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-50 left-0 w-full bg-gray-900 border border-gray-700 rounded-lg mt-1 shadow-lg max-h-56 overflow-y-auto">
              {suggestions.map((movie) => (
                <li
                  key={movie.id}
                  className="px-4 py-3 cursor-pointer hover:bg-gray-800 border-b border-gray-700 last:border-b-0"
                  onMouseDown={() => handleSuggestionClick(movie)}
                >
                  <div className="flex items-center gap-3">
                    {movie.poster_url && (
                      <img
                        src={movie.poster_url}
                        alt={movie.title}
                        className="w-12 h-16 object-cover rounded shadow-sm border border-gray-700 bg-gray-800 flex-shrink-0"
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
              {!localSearchMode && (
                <li className="px-4 py-3 text-xs text-gray-500 border-t border-gray-700 bg-gray-800">
                  Can't find your movie? <a href="/help/add-movie" className="text-blue-600 underline hover:text-blue-800">Learn how to add it</a>
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Filters Button */}
        <button
          onClick={() => setShowFiltersModal(true)}
          className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors whitespace-nowrap ${
            activeFilterCount > 0
              ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
              : "text-gray-400 border-gray-600/50 hover:bg-gray-800/50 bg-gray-800/30"
          }`}
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm">Filters</span>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Active Filter Pills */}
      {(activeFilters.length > 0 || persistentFilterLabels.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          <div className="text-xs text-gray-400 uppercase tracking-wider py-1">
            Active Filters ({activeFilterCount})
          </div>
          {persistentFilterLabels.map((label) => (
            <div
              key={`persistent-${label}`}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800/60 border border-gray-600/50 rounded-md text-xs text-gray-300"
            >
              <span>{label}</span>
            </div>
          ))}
          {activeFilters.map((filter, index) => (
            <button
              key={index}
              onClick={filter.onRemove}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800/60 border border-gray-600/50 rounded-md text-xs text-gray-300 hover:bg-gray-700/60 transition-colors"
            >
              <span>{filter.label}</span>
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}

      {/* Filters Modal/Overlay */}
      {showFiltersModal && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowFiltersModal(false)}
          />
          
          {/* Modal */}
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-200">Filters</h2>
              <button
                onClick={() => setShowFiltersModal(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Active Filters Summary */}
            {activeFilterCount > 0 && (
              <div className="px-6 py-3 bg-blue-500/10 border-b border-gray-700">
                <div className="text-sm text-blue-400 uppercase tracking-wider mb-2">
                  Active Filters ({activeFilterCount})
                </div>
                <div className="flex flex-wrap gap-2">
                  {persistentFilterLabels.map((label) => (
                    <div
                      key={`modal-persistent-${label}`}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/20 border border-blue-500/30 rounded-md text-xs text-blue-300"
                    >
                      <span>{label}</span>
                    </div>
                  ))}
                  {activeFilters.map((filter, index) => (
                    <button
                      key={index}
                      onClick={filter.onRemove}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/20 border border-blue-500/30 rounded-md text-xs text-blue-300 hover:bg-blue-500/30 transition-colors"
                    >
                      <span>{filter.label}</span>
                      <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filter Controls */}
            <div className="px-6 py-6 space-y-6">
              {/* Sort Section */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
                  <ArrowUpDown className="w-4 h-4" />
                  Sort by
                  {(sortBy !== (defaults.sortBy || "ranking") || sortOrder !== (defaults.sortOrder || "desc")) && (
                    <span className="text-xs text-blue-400 ml-auto">DEFAULT</span>
                  )}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortKey)}
                    className="w-full border border-gray-600/50 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800/70 text-gray-300"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-600/50 rounded-lg hover:bg-gray-800/50 bg-gray-800/30 transition-colors text-gray-300"
                  >
                    {sortOrder === "asc" ? (
                      <>
                        <SortAsc className="w-4 h-4" />
                        <span className="text-sm">A → Z</span>
                      </>
                    ) : (
                      <>
                        <SortDesc className="w-4 h-4" />
                        <span className="text-sm">Z → A</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* View Section */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
                  <Grid3X3 className="w-4 h-4" />
                  View
                  {viewMode !== (defaults.viewMode || "grid") && (
                    <span className="text-xs text-blue-400 ml-auto">DEFAULT</span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                      viewMode === "grid"
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : "text-gray-400 border-gray-600/50 hover:bg-gray-800/50 bg-gray-800/30"
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                    <span className="text-sm">Grid</span>
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                      viewMode === "list"
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : "text-gray-400 border-gray-600/50 hover:bg-gray-800/50 bg-gray-800/30"
                    }`}
                  >
                    <List className="w-4 h-4" />
                    <span className="text-sm">List</span>
                  </button>
                </div>
              </div>

              {/* Group Section */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
                  <Filter className="w-4 h-4" />
                  Group by
                  {groupBy !== (defaults.groupBy || "none") && (
                    <span className="text-xs text-blue-400 ml-auto">DEFAULT</span>
                  )}
                </label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as GroupKey)}
                  className="w-full border border-gray-600/50 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800/70 text-gray-300"
                >
                  {GROUP_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Section */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
                  <Filter className="w-4 h-4" />
                  Filter by
                  {(filterType !== (defaults.filterType || "none") && filterValue !== (defaults.filterValue || "all")) && (
                    <span className="text-xs text-blue-400 ml-auto">DEFAULT</span>
                  )}
                </label>
                <div className="space-y-3">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as "none" | "year" | "rank" | "movie" | "genre")}
                    className="w-full border border-gray-600/50 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800/70 text-gray-300"
                  >
                    <option value="none">No filter</option>
                    <option value="year">Year</option>
                    <option value="rank">Rating</option>
                    {uniqueGenres.length > 0 && <option value="genre">Genre</option>}
                  </select>

                  {filterType === "year" && (
                    <select
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      className="w-full border border-gray-600/50 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800/70 text-gray-300"
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
                      className="w-full border border-gray-600/50 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800/70 text-gray-300"
                    >
                      <option value="all">All Ratings</option>
                      <option value="unranked">No Rating</option>
                      {uniqueRanks.map((rank) => (
                        <option key={rank} value={rank}>
                          {rank}
                        </option>
                      ))}
                    </select>
                  )}

                  {filterType === "genre" && (
                    <select
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      className="w-full border border-gray-600/50 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800/70 text-gray-300"
                    >
                      <option value="all">All Genres</option>
                      {uniqueGenres.map((genre) => (
                        <option key={genre} value={genre}>
                          {genre}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 px-6 py-4 flex gap-3">
              <button
                onClick={handleClearAll}
                disabled={isDefault}
                className={`flex-1 px-4 py-3 rounded-lg border transition-colors touch-manipulation min-h-[44px] font-medium ${
                  isDefault
                    ? "opacity-50 cursor-not-allowed text-gray-400 border-gray-600/50 bg-gray-800/30"
                    : "text-gray-200 border-gray-600/50 hover:bg-gray-800/50 bg-gray-800/30"
                }`}
              >
                Clear All
              </button>
              <button
                onClick={() => setShowFiltersModal(false)}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors touch-manipulation min-h-[44px] font-medium"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
