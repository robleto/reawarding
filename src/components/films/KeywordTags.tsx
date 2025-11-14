"use client";

import { Tag } from "lucide-react";

interface KeywordTagsProps {
  keywords: string[];
  className?: string;
  maxDisplay?: number;
}

export default function KeywordTags({ 
  keywords, 
  className = "",
  maxDisplay = 15
}: KeywordTagsProps) {
  // Ensure keywords is an array with valid data
  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return null;
  }

  // Filter out empty or invalid keywords
  const validKeywords = keywords.filter(k => k && typeof k === 'string' && k.trim().length > 0);
  if (validKeywords.length === 0) {
    return null;
  }

  const displayKeywords = validKeywords.slice(0, maxDisplay);
  const remainingCount = validKeywords.length - displayKeywords.length;

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <Tag className="w-5 h-5 text-yellow-400" />
        <h3 className="text-lg font-unbounded font-semibold text-yellow-400">Keywords</h3>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {displayKeywords.map((keyword, index) => (
          <span
            key={index}
            className="px-3 py-1.5 rounded-full text-sm bg-gray-800/60 text-gray-200 border border-yellow-500/10 hover:border-yellow-500/30 transition-colors"
          >
            {keyword}
          </span>
        ))}
        
        {remainingCount > 0 && (
          <span className="px-3 py-1.5 rounded-full text-sm bg-gray-800/40 text-gray-400 border border-gray-700">
            +{remainingCount} more
          </span>
        )}
      </div>
    </div>
  );
}
