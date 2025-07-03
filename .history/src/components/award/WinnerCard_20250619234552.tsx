import React from "react";
import Image from "next/image";

interface WinnerCardProps {
  title: string;
  poster_url: string; // <-- updated name
  rating: number;
}

export default function WinnerCard({
  title,
  poster_url,
  rating,
}: WinnerCardProps) {
  return (
    <article className="text-center">
      {/* Trophy and label */}
      <div className="inline-flex items-center justify-center gap-2">
        <span className="text-xl">🏆</span>
        <h3 className="text-2xl font-bold text-[#cb8601]">Winner</h3>
      </div>

      {/* Poster image container */}
      <div className="relative w-full aspect-[2/3] mx-auto max-w-[240px] rounded-xl overflow-hidden shadow-lg mt-4">
        <Image
          src={poster_url}
          alt={title}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 240px"
          priority
        />

        {/* Rating badge */}
        <div className="absolute bottom-2 right-2 bg-white/80 rounded-md px-2 py-1 text-sm font-semibold text-[#1a3448]">
          {rating}
        </div>
      </div>

      {/* Movie title */}
      <h4 className="mt-3 text-xl font-semibold text-[#1a3448]">{title}</h4>
    </article>
