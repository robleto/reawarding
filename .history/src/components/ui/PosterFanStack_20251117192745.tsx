"use client";
import Image from 'next/image';
import { normalizeImageUrl } from '@/utils/imageUrl';

type PosterFanStackProps = {
  posterUrls: string[];
  className?: string;
  posterWidth?: number; // default 64
  posterHeight?: number; // default 96
  spread?: number; // px between cards, default 32
  rotationStep?: number; // degrees per step, default 7
  showRadial?: boolean; // show radial highlight, default true
};

export default function PosterFanStack({
  posterUrls,
  className,
  posterWidth = 64,
  posterHeight = 96,
  spread = 32,
  rotationStep = 7,
  showRadial = true,
}: PosterFanStackProps) {
  if (!posterUrls || posterUrls.length === 0) return null;

  const baseClass = "h-24 w-[180px] flex items-center justify-center pointer-events-none select-none z-20 transition-transform duration-200 group-hover:scale-105";
  const wrapperClass = className ? `${baseClass} ${className}` : baseClass;

  const centerIndex = Math.round((posterUrls.length - 1) / 2);

  return (
    <div className={wrapperClass}>
      {showRadial && (
        <span
          aria-hidden
          className="absolute -top-1 left-1/2 -translate-x-1/2 w-[220px] h-[100px] rounded-full blur-md opacity-30 bg-[radial-gradient(ellipse_at_center,_rgba(234,179,8,0.25),_transparent_60%)]"
        />
      )}
      {posterUrls.map((url, i) => {
        const leftOffset = (i - (posterUrls.length - 1) / 2) * spread;
        const rotate = (i - centerIndex) * rotationStep;
        const src = normalizeImageUrl(url);
        return (
          <div
            key={`${i}-${url}`}
            className="absolute overflow-hidden border-2 border-gray-800 shadow-lg rounded-xl transition-transform duration-200 ease-out group"
            style={{
              width: `${posterWidth}px`,
              height: `${posterHeight}px`,
              left: `calc(50% + ${leftOffset}px - ${posterWidth / 2}px)`,
              zIndex: posterUrls.length - i,
              transform: `rotate(${rotate}deg)`,
            }}
          >
            {/* Emphasize the center poster on hover */}
            <div className={i === centerIndex ? 'group-hover:scale-105 group-hover:-translate-y-0.5 filter group-hover:brightness-110 w-full h-full' : 'w-full h-full'}>
              {src ? (
                <Image src={src} alt="Movie poster" fill className="object-cover" sizes={`${posterWidth}px`} />
              ) : (
                <div className="w-full h-full bg-gray-700" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
