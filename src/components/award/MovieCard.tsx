import React from "react";
import Image from "next/image";
import { Film } from "lucide-react";
import { getRatingStyle } from "@/utils/getRatingStyle";
import type { Movie } from "@/types/types";
import { normalizeImageUrl } from "@/utils/imageUrl";

interface MovieCardProps {
	movie: Movie;
	onClick?: () => void;
	imageMode?: "thumb" | "poster";
}

// Fallback for missing images (from MovieRowCard)
const ImageFallback = ({
	width = 160,
	height = 90,
	title,
	className = ""
}: {
	width?: number;
	height?: number;
	title: string;
	className?: string;
}) => (
	<div
		className={`flex items-center justify-center bg-gray-100 text-gray-400 ${className}`}
		style={{ width, height }}
	>
		<div className="text-center">
			<Film className="w-6 h-6 mx-auto mb-1" />
			<div className="text-xs font-medium truncate px-2" style={{ maxWidth: width - 8 }}>
				{title}
			</div>
		</div>
	</div>
);

export default function MovieCard({ movie, onClick, imageMode = "thumb" }: MovieCardProps) {
	const rating = movie.rankings?.[0]?.ranking ?? 0;
	const { text, background } = getRatingStyle(rating);
	const imageSrc = imageMode === "poster"
		? (movie.poster_url || movie.thumb_url)
		: (movie.thumb_url || movie.poster_url);
	const hasValidImage = imageSrc && imageSrc.trim() !== '' && !imageSrc.includes('placeholder');
	const imageWidth = imageMode === "poster" ? 240 : 160;
	const imageHeight = imageMode === "poster" ? 360 : 90;

	return (
		<article
			className={`w-full ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
			onClick={onClick}
		>
			<div className={`relative rounded-lg shadow-sm dark:shadow-gray-600 overflow-hidden bg-gray-100 ${
				imageMode === "poster" ? "aspect-[2/3]" : "aspect-video"
			}`}>
				{hasValidImage ? (
					<Image
						src={normalizeImageUrl(imageSrc)}
						alt={movie.title}
						width={imageWidth}
						height={imageHeight}
						className="object-cover w-full h-full"
						unoptimized
						onError={(e) => {
							e.currentTarget.style.display = 'none';
							const fallback = e.currentTarget.nextElementSibling as HTMLElement;
							if (fallback) fallback.style.display = 'flex';
						}}
					/>
				) : null}
				{!hasValidImage && (
					<ImageFallback width={imageWidth} height={imageHeight} title={movie.title} className="rounded w-full h-full" />
				)}
				{/* Overlay rating badge */}
				<div
					className="absolute bottom-1 right-1 rounded px-2 py-0.5 text-xs font-semibold"
					style={{ color: text, backgroundColor: background }}
				>
					{rating}
				</div>
			</div>
			<h4 className="mt-2 text-sm font-semibold text-black dark:text-white truncate">
				{movie.title}
			</h4>
		</article>
	);
}
