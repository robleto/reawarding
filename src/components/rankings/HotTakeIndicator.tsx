import { Flame, TrendingUp, TrendingDown } from "lucide-react";

interface HotTakeIndicatorProps {
  myRating: number;
  imdbRating?: number;
  metacriticScore?: number;
  compact?: boolean;
}

export default function HotTakeIndicator({ 
  myRating, 
  imdbRating, 
  metacriticScore,
  compact = false 
}: HotTakeIndicatorProps) {
  // Convert ratings to 10-point scale
  const imdb = imdbRating || 0;
  const metacritic = metacriticScore ? metacriticScore / 10 : 0;
  
  // Use IMDB if available, otherwise Metacritic
  const criticsRating = imdb > 0 ? imdb : metacritic;
  const source = imdb > 0 ? 'IMDB' : 'MC';
  
  // Don't show if no critic rating available
  if (criticsRating === 0) return null;
  
  // Calculate disparity
  const disparity = myRating - criticsRating;
  
  // Only show if significant disparity (±2 or more)
  if (Math.abs(disparity) < 2) return null;
  
  const isPositive = disparity > 0;
  const absDisparity = Math.abs(disparity).toFixed(1);
  
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
        isPositive 
          ? "bg-green-500/20 text-green-400" 
          : "bg-red-500/20 text-red-400"
      }`}>
        <Flame className="w-3 h-3" />
        {isPositive ? "+" : ""}{absDisparity}
      </div>
    );
  }
  
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
      isPositive
        ? "bg-green-500/10 border-green-500/30 text-green-400"
        : "bg-red-500/10 border-red-500/30 text-red-400"
    }`}>
      <Flame className="w-4 h-4" />
      <div className="flex items-center gap-2 text-sm">
        {isPositive ? (
          <TrendingUp className="w-4 h-4" />
        ) : (
          <TrendingDown className="w-4 h-4" />
        )}
        <span className="font-semibold">
          {isPositive ? "+" : ""}{absDisparity}
        </span>
        <span className="text-xs text-gray-400">vs {source}</span>
      </div>
    </div>
  );
}
