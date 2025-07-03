import React from "react";
// If using Next.js, uncomment the following line and comment out the <img> tag below:
// import Image from "next/image";

interface WinnerCardProps {
	title: string;
	imageUrl: string; // should be poster_url
	rating: number;
}

export default function WinnerCard({
	title,
	imageUrl,
	rating,
}: WinnerCardProps) {
	return (
		<article className="text-center">
			{/* Header with trophy and title */}
			<div className="inline-flex items-center justify-center gap-2">
				{/* You can swap this emoji with a real SVG if needed */}
				<span className="text-xl">🏆</span>
				<h3 className="text-2xl font-bold text-[#cb8601]">Winner</h3>
			</div>

			{/* Poster image */}
					<img
						src={imageUrl}
						alt={title}
						className="object-contain w-full h-full"
					/>
				</div>

				{/* Rating badge */}
				<div className="absolute bottom-2 right-2 bg-white/80 rounded-md px-2 py-1 text-sm font-semibold text-[#1a3448]">
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
