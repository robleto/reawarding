import { useEffect, useState } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import type { Database } from "@/types/supabase";
import type { Movie } from "@/types/types";

export type SortKey = "title" | "release_year" | "ranking";
export type GroupKey = "release_year" | "ranking" | "none";

export const SORT_OPTIONS = [
  { value: "title", label: "Title" },
  { value: "release_year", label: "Release Year" },
  { value: "ranking", label: "My Ranking" },
];

export const GROUP_OPTIONS = [
  { value: "release_year", label: "Year" },
  { value: "ranking", label: "Ranking" },
  { value: "none", label: "None" },
];

export function sortMovies(
  movies: Movie[],
  sortBy: SortKey,
  sortOrder: "asc" | "desc"
): Movie[] {
  return [...movies].sort((a, b) => {
    const getValue = (movie: Movie) => {
      if (sortBy === "ranking") return movie.rankings[0]?.ranking ?? 0;
      if (sortBy === "release_year") return movie.release_year ?? 0;
      if (sortBy === "title") return movie.title?.toLowerCase() ?? "
