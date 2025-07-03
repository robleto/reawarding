import React from "react";
import { SORT_OPTIONS, GROUP_OPTIONS } from "@/utils/sharedMovieUtils";
import type { SortKey, GroupKey, SortOrder } from "@/utils/sharedMovieUtils";

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
  filterType: "none" | "year" | "rank";
  setFilterType: (type: "none" | "year" | "rank") => void;
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
  return (
    <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-700">
        {/* Group by */}
        <div className="flex items-center gap-2">
          <label htmlFor="group-select">Group by</label>
          <select
            id="group-select"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupKey)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {GROUP_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort by */}
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select">Sort by</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            aria-label="Toggle sort order"
            className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
            title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
          >
            {sortOrder === "asc" ? (
              <span className="text-xl">▲</span>
            ) : (
              <span className="text-xl">▼</span>
            )}
          </button>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          <label htmlFor="filter-type-select">Filter by</label>
          <select
            id="filter-type-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as "none" | "year" | "rank")}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="none">None</option>
            <option value="year">Year</option>
            <option value="rank">Ranking</option>
          </select>

          {filterType === "year" && (
            <select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* View mode toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode("list")}
          className={`p-2 rounded-full border ${
            viewMode === "list"
              ? "border-blue-500 bg-blue-50 text-blue-600"
              : "border-gray-300 text-gray-600 hover:bg-gray-100"
          } transition-colors`}
          title="List view"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <button
          onClick={() => setViewMode("grid")}
          className={`p-2 rounded-full border ${
            viewMode === "grid"
              ? "border-blue-500 bg-blue-50 text-blue-600"
              : "border-gray-300 text-gray-600 hover:bg-gray-100"
          } transition-colors`}
          title="Grid view"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
