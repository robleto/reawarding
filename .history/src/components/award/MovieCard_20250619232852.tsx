import React from "react";
import { getRatingStyle } from "@/utils/getRatingStyle";

interface MovieCardProps {
	title: string;
	imageUrl: string;
	rating: number;
}

export default function MovieCard({ title, imageUrl, rating }: MovieCardProps) {
	const { text, background } = getRatingStyle(rating);

	return (
		<article className="w-full">
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
