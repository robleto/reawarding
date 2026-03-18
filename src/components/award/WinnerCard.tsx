import React from "react";
import MovieCard from "./MovieCard";
import type { Movie } from "@/types/types";

interface WinnerCardProps {
	movie: Movie;
	onClick?: () => void;
}

/**
 * WinnerCard — thin wrapper around the unified MovieCard (featured variant).
 * Kept for API compatibility; delegates all rendering to MovieCard.
 */
export default function WinnerCard({ movie, onClick }: WinnerCardProps) {
	return <MovieCard movie={movie} variant="featured" isWinner onClick={onClick} />;
}
