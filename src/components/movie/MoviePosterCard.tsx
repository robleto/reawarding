"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, Film } from "lucide-react";
import { getRatingStyle } from "@/utils/getRatingStyle";
import type { Movie } from "@/types/types";

type Props = {
  movie: Movie;
  currentUserId: string;
  ranking: number | null;
  seenIt: boolean;
  onUpdate: (movieId: number, updates: { seen_it?: boolean; ranking?: number | null }) => void;
  onClick?: () => void;
};

const RANKING_OPTIONS = Array.from({ length: 10 }, (_, i) => 10 - i);

// Fallback component for missing poster images
const PosterFallback = ({ 
  title, 
  className = "" 
}: { 
  title: string; 
  className?: string; 
}) => (
  <div 
    className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 aspect-[2/3] ${className}`}
  >
    <div className="text-center px-4">
      <Film className="w-12 h-12 mx-auto mb-2" />
      <div className="text-sm font-medium text-center leading-tight">
        {title}
      </div>
    </div>
  </div>
);

export default function MoviePosterCard({ movie, currentUserId, onUpdate, ranking, seenIt, onClick }: Props) {
  const [showDropdown, setShowDropdown] = useState(false);

  const style = getRatingStyle(ranking ?? 0);

  // Check if poster image exists and is valid
  const hasValidPoster = movie.poster_url && movie.poster_url.trim() !== '' && !movie.poster_url.includes('placeholder');

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger onClick if user is clicking on interactive elements
    if (e.target instanceof HTMLElement) {
      const isInteractiveElement = e.target.closest('button, select, input, a');
      if (!isInteractiveElement && onClick) {
        onClick();
      }
    }
  };

  return (
		<div 
			className={`relative flex flex-col overflow-visible transition bg-white dark:bg-gray-800 shadow hover:shadow-lg dark:shadow-gray-800 rounded-xl ${onClick ? 'cursor-pointer' : ''}`}
			onClick={handleClick}
		>
			{hasValidPoster ? (
				<Image
					src={movie.poster_url}
					alt={movie.title}
					width={300}
					height={450}
					className="w-full h-auto rounded-t-xl"
					unoptimized
					onError={(e) => {
						// Hide broken image and show fallback
						e.currentTarget.style.display = 'none';
						const fallback = e.currentTarget.nextElementSibling as HTMLElement;
						if (fallback) fallback.style.display = 'flex';
					}}
				/>
			) : null}
			{!hasValidPoster && (
				<PosterFallback
					title={movie.title}
					className="w-full rounded-t-xl"
				/>
			)}

			<div className="flex flex-col justify-between flex-grow h-full px-3 py-2 min-h-[7rem]">
				<div>
					<h3 className="text-sm font-semibold leading-tight line-clamp-2 text-gray-900 dark:text-white">
						{movie.title}
					</h3>
					<p className="text-xs text-gray-600 dark:text-gray-400">
						{movie.release_year}
					</p>
				</div>

				<div className="flex items-end justify-between mt-3">
					<button
						onClick={() =>
							onUpdate(movie.id, { seen_it: !seenIt })
						}
						className="flex items-center gap-1 text-sm font-medium"
					>
						{seenIt ? (
							<>
								<Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
								<span className="text-blue-600 dark:text-blue-400">Seen It</span>
							</>
						) : (
							<>
								<EyeOff className="w-4 h-4 text-gray-400 dark:text-gray-500" />
								<span className="text-gray-400 dark:text-gray-500">Unseen</span>
							</>
						)}
					</button>

					<div className="relative z-20">
						<button
							onClick={() => setShowDropdown(!showDropdown)}
							className="text-sm font-bold px-2 py-1 min-w-[32px] min-h-[32px] rounded-lg"
							style={{
								backgroundColor: style.background,
								color: style.text,
							}}
						>
							{ranking ?? "-"}
						</button>

						{showDropdown && (
							<div className="absolute right-0 z-50 w-10 mb-1 overflow-y-auto bg-white dark:bg-gray-800 rounded shadow-lg dark:shadow-gray-700 bottom-full max-h-60">
								{/* Clear ranking option */}
								<div
									onClick={() => {
										onUpdate(movie.id, {
											ranking: null,
										});
										setShowDropdown(false);
									}}
									className="mx-2 my-2 text-sm font-semibold text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded"
								>
									-
								</div>
								{RANKING_OPTIONS.map((num) => {
									const optionStyle = getRatingStyle(num);
									return (
										<div
											key={num}
											onClick={() => {
												onUpdate(movie.id, {
													ranking: num,
												});
												setShowDropdown(false);
											}}
											className="mx-2 my-2 text-sm font-semibold text-center cursor-pointer hover:brightness-110"
											style={{
												backgroundColor:
													optionStyle.background,
												color: optionStyle.text,
											}}
										>
											{num}
										</div>
									);
								})}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
  );
}
