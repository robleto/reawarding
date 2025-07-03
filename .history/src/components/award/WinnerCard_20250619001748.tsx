import React from 'react';

interface WinnerCardProps {
  title: string;
  imageUrl: string;
  rating: number;
}

export default function WinnerCard({ title, imageUrl, rating }: WinnerCardProps) {
  return (
    <article className="text-center">
      <div className="inline-flex items-center gap-2">
        <div className="w-7 h-6 bg-[url('/icons/trophy.png')] bg-cover" />
        <h3 className="text-2xl font-bold text-[#cb8601]">Winner</h3>
      </div>
      <div className="mt-4 mx-auto">
        <div
          className="aspect-[2/3] bg-cover rounded-xl shadow-lg relative"
          style={{ backgroundImage: `url(${imageUrl})` }}
        >
          <div className="absolute bottom-2 right-2 bg-white/80 rounded-md px-2 py-1 text-sm font-semibold text-[#1a3448]">
            {rating}
          </div>
        </div>
        <h4 className="mt-3 text-xl font-semibold">{title}</h4>
      </div>
    </article>
  );
}
