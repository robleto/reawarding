import React from "react";
import MovieCard from "./MovieCard";
import type { Movie } from "@/types/types";
import type { AcademyStatusResult } from "@/data/officialAwardWinners";

interface WinnerCardProps {
	movie: Movie;
	onClick?: () => void;
	/** Upheld/Reawarded/Unscreened badge vs. the real Academy winner */
	academyStatus?: AcademyStatusResult | null;
	/** Hide the rating number overlay (e.g. when an Academy stamp sits near it) */
	hideRating?: boolean;
}

/**
 * WinnerCard — thin wrapper around the unified MovieCard (featured variant).
 * Kept for API compatibility; delegates all rendering to MovieCard.
 */
export default function WinnerCard({ movie, onClick, academyStatus, hideRating }: WinnerCardProps) {
	return <MovieCard movie={movie} variant="featured" isWinner onClick={onClick} academyStatus={academyStatus} hideRating={hideRating} />;
}
