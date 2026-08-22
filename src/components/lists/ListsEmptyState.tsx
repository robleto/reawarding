"use client";

import { Plus, Star } from "lucide-react";
import Link from "next/link";

interface ListsEmptyStateProps {
  onCreateList: () => void;
}

export default function ListsEmptyState({ onCreateList }: ListsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center px-6 pt-[12vh] pb-10">
      <img
        src="/reawarding-logomark.svg"
        alt=""
        className="w-14 h-14 mb-6 opacity-90"
      />
      <h1 className="text-2xl sm:text-3xl tracking-wide font-unbounded uppercase text-white mb-3">
        No lists yet
      </h1>
      <p className="text-sm sm:text-base text-gray-400 max-w-sm mb-8">
        Group films into whatever you want — a watchlist, a director's best work, your top 10 of the year.
      </p>

      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <button
          onClick={onCreateList}
          className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-full bg-gold-500 text-black font-semibold hover:bg-gold-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create your first list
        </button>
        <Link
          href="/films"
          className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-gray-300 hover:bg-white/10 transition-colors text-sm font-medium"
        >
          <Star className="w-4 h-4" />
          Browse movies first
        </Link>
      </div>
    </div>
  );
}
