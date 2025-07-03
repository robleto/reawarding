import React from "react";

interface WinnerCardProps {
	title: string;
	imageUrl: string; // This will now be the poster_url
	rating: number;
}

export default function WinnerCard({
	title,
	imageUrl,
	rating,
}: WinnerCardProps) {
	return (
		<article className="text-center">
			{/* Winner Label */}
			<div className="inline-flex items-center justify-center gap-2">
				<div
					className="w-6 h-6 bg-[url('/icons/trophy.png')] bg-contain bg-no-repeat"
					style={{
						filter: "brightness(0) saturate(100%) sepia(99%) hue-rotate(12deg) saturate(600%) brightness(1.1)",
					}}
				/>
				<h3 className="text-2xl font-bold text-[#cb8601]">Winner</h3>
			</div>

			{/* Poster */}
			<div className="mt-4 mx-auto max-w-[240px]">
				<div
					className="aspect-[2/3] bg-cover bg-center rounded-xl shadow-lg relative"
					style={{ backgroundImage: `url(${imageUrl})` }}
				>
					{/* Rating Badge */}
					<div className="absolute bottom-2 right-2 bg-white/80 rounded-md px-2 py-1 text-sm font-semibold text-[#1a3448]">
						{rating}
					</div>
				</div>
				<h4 className="mt-3 text-xl font-semibold text-[#1a3448]">
					{title}
				</h4>
			</div>
		</article>
	);
}
