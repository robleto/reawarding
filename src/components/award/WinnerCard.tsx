import React from "react";
import Image from "next/image";
import { Film } from "lucide-react";
import { getRatingStyle } from "@/utils/getRatingStyle";

interface WinnerCardProps {
	title: string;
	poster_url: string;
	rating: number;
	onClick?: () => void;
}

// Fallback component for missing poster images
const WinnerPosterFallback = ({ 
  title, 
  rating 
}: { 
  title: string; 
  rating: number; 
}) => {
  const { background, text } = getRatingStyle(rating);
  
  return (
    <div className="relative w-full aspect-[2/3] my-4 mx-auto rounded-xl overflow-hidden shadow-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
      <div className="text-center px-4 text-gray-400 dark:text-gray-500">
        <Film className="w-16 h-16 mx-auto mb-2" />
        <div className="text-sm font-medium text-center leading-tight">
          {title}
        </div>
      </div>
      
      {/* Styled rating badge */}
      <div
        className="absolute px-2 py-1 text-sm font-semibold rounded-md bottom-2 right-2"
        style={{ backgroundColor: background, color: text }}
      >
        {rating}
      </div>
    </div>
  );
};

export default function WinnerCard({
	title,
	poster_url,
	rating,
	onClick,
}: WinnerCardProps) {
	const { background, text } = getRatingStyle(rating);

	// Check if poster image exists and is valid
	const hasValidPoster = poster_url && poster_url.trim() !== '' && !poster_url.includes('placeholder');

	return (
		<article 
			className={`text-left ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
			onClick={onClick}
		>
			{/* Header with trophy and title */}
			<div className="inline-flex items-center justify-center gap-2">
				<span className="text-xl">🏆</span>
				<h3 className="text-2xl font-bold text-[#cb8601] dark:text-yellow-400">Winner</h3>
			</div>

			{/* Poster image */}
			{hasValidPoster ? (
				<div className="relative w-full aspect-[2/3] my-4 mx-auto rounded-xl overflow-hidden shadow-lg dark:shadow-gray-600">
					<Image
						src={poster_url}
						alt={title}
						fill
						className="object-contain"
						sizes="(max-width: 768px) 100vw, 240px"
						priority
						onError={(e) => {
							// Hide broken image and show fallback
							const container = e.currentTarget.parentElement;
							if (container) {
								container.style.display = 'none';
								const fallback = container.nextElementSibling as HTMLElement;
								if (fallback) fallback.style.display = 'block';
							}
						}}
					/>

					{/* Styled rating badge */}
					<div
						className="absolute px-2 py-1 text-sm font-semibold rounded-md bottom-2 right-2"
						style={{ backgroundColor: background, color: text }}
					>
						{rating}
					</div>
				</div>
			) : (
				<WinnerPosterFallback title={title} rating={rating} />
			)}

			{/* Movie title */}
			<h4 className="mt-3 text-xl font-semibold text-[#1a3448] dark:text-white">
				{title}
			</h4>
		</article>
	);
}
