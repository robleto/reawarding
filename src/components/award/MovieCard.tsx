import React from "react";
import { getRatingStyle } from "@/utils/getRatingStyle";

interface MovieCardProps {
	title: string;
	imageUrl: string;
	rating: number;
	onClick?: () => void;
}

export default function MovieCard({ title, imageUrl, rating, onClick }: MovieCardProps) {
	const { text, background } = getRatingStyle(rating);

	return (
		<article 
			className={`w-full ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
			onClick={onClick}
		>
			<div
				className="relative bg-cover rounded-lg shadow-sm aspect-video"
				style={{ backgroundImage: `url(${imageUrl})` }}
			>
				<div
					className="absolute bottom-1 right-1 rounded px-1 py-0.5 text-xs font-semibold"
					style={{ color: text, backgroundColor: background }}
				>
					{rating}
				</div>
			</div>
			<h4 className="mt-2 text-sm font-semibold text-black truncate">
				{title}
			</h4>
		</article>
	);
}
