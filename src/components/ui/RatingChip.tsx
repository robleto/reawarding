import { getRatingStyle } from "@/utils/getRatingStyle";

export default function RatingChip({ rating }: { rating: number }) {
  const style = getRatingStyle(rating);
  return (
    <span
      className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded text-[10px] font-bold leading-none tabular-nums align-middle"
      style={{ backgroundColor: style.background, color: style.text }}
      aria-label={`Rating ${rating}`}
    >
      {rating}
    </span>
  );
}
