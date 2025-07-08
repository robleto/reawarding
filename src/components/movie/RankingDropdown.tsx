import React, { useState } from "react";
import { getRatingStyle } from "@/utils/getRatingStyle";

interface RankingDropdownProps {
  ranking: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}

const RANKING_OPTIONS = Array.from({ length: 10 }, (_, i) => 10 - i);

export default function RankingDropdown({ ranking, onChange, disabled = false }: RankingDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const style = getRatingStyle(ranking ?? 0);

  return (
    <div className="relative z-30">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setShowDropdown(!showDropdown)}
        className="text-sm font-bold px-2 py-1 min-w-[32px] min-h-[32px] rounded-lg border border-gray-700 bg-gray-900/80 text-white"
        style={{ backgroundColor: style.background, color: style.text }}
      >
        {ranking ?? "-"}
      </button>
      {showDropdown && !disabled && (
        <div
          className="absolute right-[-16px] z-50 w-16 mb-1 overflow-y-auto bg-white dark:bg-gray-800 rounded shadow-lg dark:shadow-gray-700 bottom-full max-h-60 flex flex-col items-center"
          style={{ minWidth: '3.5rem' }}
        >
          {/* Clear ranking option */}
          <div
            onClick={e => {
              e.stopPropagation();
              onChange(null);
              setShowDropdown(false);
            }}
            className="mx-auto my-2 text-sm font-semibold text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded w-8 h-8 flex items-center justify-center"
          >
            -
          </div>
          <div className="flex flex-col items-center gap-1">
            {RANKING_OPTIONS.map((num) => {
              const optionStyle = getRatingStyle(num);
              return (
                <div
                  key={num}
                  onClick={e => {
                    e.stopPropagation();
                    onChange(num);
                    setShowDropdown(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-sm font-semibold text-center cursor-pointer hover:brightness-110 rounded"
                  style={{ backgroundColor: optionStyle.background, color: optionStyle.text }}
                >
                  {num}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
