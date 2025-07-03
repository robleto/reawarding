"use client";

import React, { useEffect, useState } from "react";
import YearSection from "@/components/award/YearSection";
import { fetchRankings } from "@/utils/fetchRankings";

interface DisplayMovie {
	id: string;
	title: string;
	release_year: string;
	thumb_url: string;
	poster_url: string;
	ranking: number;
}

interface YearData {
	year: string;
	winner: DisplayMovie;
	nominees: DisplayMovie[];
}

export default function AwardsPage() {
	const [yearsData, setYearsData] = useState<YearData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function loadData() {
			setLoading(true);
			try {
				const movies = await fetchRankings();

				const moviesWithRankings: DisplayMovie[] = movies.map(
					(movie) => ({
						id: String(movie.id), // force id to string
						title: movie.title,
						release_year: movie.release_year,
						thumb_url: movie.thumb_url,
						poster_url: movie.thumb_url, // use thumb for poster
						ranking: movie.rankings?.[0]?.ranking ?? 0,
					})
				);

				const groupedByYear = moviesWithRankings.reduce<
					Record<string, DisplayMovie[]>
				>((acc, movie) => {
					const year = movie.release_year;
					if (!acc[year]) acc[year] = [];
					acc[year].push(movie);
					return acc;
				}, {});

				const formattedYears: YearData[] = Object.entries(
					groupedByYear
				).map(([year, movies]) => {
					const sorted = [...movies].sort(
						(a, b) => b.ranking - a.ranking
					);
					return {
						year,
						winner: sorted[0],
						nominees: sorted.slice(1, 10),
					};
				});

				setYearsData(
					formattedYears.sort(
						(a, b) => Number(b.year) - Number(a.year)
					)
				); // latest year first
			} catch (err) {
				console.error(err);
				setError("Failed to load movie data.");
			} finally {
				setLoading(false);
			}
		}

		loadData();
	}, []);

	if (loading) return <div className="p-6">Loading...</div>;
	if (error) return <div className="p-6 text-red-600">{error}</div>;

	return (
		<div className="max-w-screen-lg p-6 mx-auto">
			<main className="flex-1 mt-8 space-y-24">
				{yearsData.map((yearData) => (
					<YearSection
						key={yearData.year}
						year={yearData.year}
						winner={yearData.winner}
						movies={yearData.nominees}
					/>
				))}
			</main>
		</div>
	);
}
