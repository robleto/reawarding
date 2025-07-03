"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { getRatingStyle } from "@/utils/getRatingStyle";
import type { Movie } from "@/types/types";

type Props = {
  movie: Movie;
  currentUserId: string;
  ranking: number | null;
  seenIt: boolean;
  onUpdate: (movieId: number, updates: { seen_it?: boolean; ranking?: number | null }) => void;
};

const RANKING_OPTIONS = Array.from({ length: 10 }, (_, i) => 10 - i);

export default function MoviePosterCard({ movie, currentUserId, onUpdate, ranking, seenIt }: Props) {
  const [showDropdown, setShowDropdown] = useState(false);

  const style = getRatingStyle(ranking ?? 0);

  return (
		<div className="relative flex flex-col overflow-visible transition bg-white shadow hover:shadow-lg rounded-xl">
			<Image
				src={movie.poster_url}
				alt={movie.title}
				width={300}
				height={450}
				className="w-full h-auto rounded-t-xl"
				unoptimized
			/>

			<div className="flex flex-col justify-between flex-grow h-full px-3 py-2 min-h-[7rem]">
				<div>
					<h3 className="text-sm font-semibold leading-tight line-clamp-2 ">
						{movie.title}
					</h3>
					<p className="text-xs text-gray-600">
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
								<Eye className="w-4 h-4 text-blue-600" />
								<span className="text-blue-600">Seen It</span>
							</>
						) : (
							<>
								<EyeOff className="w-4 h-4 text-gray-400" />
								<span className="text-gray-400">Unseen</span>
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
							<div className="absolute right-0 z-50 w-10 mb-1 overflow-y-auto bg-white rounded shadow-lg bottom-full max-h-60">
								{/* Clear ranking option */}
								<div
									onClick={() => {
										onUpdate(movie.id, {
											ranking: null,
										});
										setShowDropdown(false);
									}}
									className="mx-2 my-2 text-sm font-semibold text-center cursor-pointer hover:bg-gray-100 text-gray-500 border border-gray-300 rounded"
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
