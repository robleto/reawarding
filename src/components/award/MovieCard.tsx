import React from "react";
import Image from "next/image";
import { Film } from "lucide-react";
import { getRatingStyle } from "@/utils/getRatingStyle";

interface MovieCardProps {
	title: string;
	imageUrl: string;
	rating: number;
	onClick?: () => void;
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

export default function MovieCard({ title, imageUrl, rating, onClick }: MovieCardProps) {
	const { text, background } = getRatingStyle(rating);
	const hasValidImage = imageUrl && imageUrl.trim() !== '' && !imageUrl.includes('placeholder');

	return (
		<article
			className={`w-full ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
			onClick={onClick}
		>
			<div className="relative aspect-video rounded-lg shadow-sm dark:shadow-gray-600 overflow-hidden bg-gray-100">
				{hasValidImage ? (
					<Image
						src={imageUrl}
						alt={title}
						width={160}
						height={90}
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
					<ImageFallback width={160} height={90} title={title} className="rounded" />
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
				{title}
			</h4>
		</article>
	);
}
