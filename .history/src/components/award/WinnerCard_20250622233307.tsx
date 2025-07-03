import React from "react";
import Image from "next/image";
import { getRatingStyle } from "@/utils/getRatingStyle";

interface WinnerCardProps {
	title: string;
	poster_url: string;
	rating: number;
}

export default function WinnerCard({
	title,
	poster_url,
	rating,
}: WinnerCardProps) {
	const { background, text } = getRatingStyle(rating);

	return (
		<article className="text-center">
			{/* Header with trophy and title */}
			<div className="inline-flex items-center justify-center gap-2">
				<span className="text-xl">🏆</span>
				<h3 className="text-2xl font-bold text-[#cb8601]">Winner</h3>
			</div>

			{/* Poster image */}
			<div className="relative w-full aspect-[2/3] my-4 mx-auto ] rounded-xl overflow-hidden shadow-lg">
				<Image
					src={poster_url}
					alt={title}
					fill
					className="object-contain"
					sizes="(max-width: 768px) 100vw, 240px"
					priority
				/>

				{/* Styled rating badge */}
				<div
					className="absolute px-2 py-1 text-sm font-semibold rounded-md bottom-2 right-2"
					style={{ backgroundColor: background, color: text }}
				>
					{rating}
				</div>
			</div>

			{/* Movie title */}
			<h4 className="mt-3 text-xl font-semibold text-[#1a3448]">
				{title}
			</h4>
		</article>
	);
}
