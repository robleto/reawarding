import React from "react";
import ListCard from "@/components/list/ListCard";
import Link from "next/link";

interface HorizontalListRowProps {
  title: string;
  lists: any[];
  seeAllHref?: string;
  readOnly?: boolean;
  onAdd?: () => void;
}

const HorizontalListRow: React.FC<HorizontalListRowProps> = ({ title, lists, seeAllHref, readOnly, onAdd }) => {
  if (!lists || lists.length === 0) return null;
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xl font-bold text-white tracking-wide">{title}</h2>
        {seeAllHref && (
          <Link href={seeAllHref} className="text-blue-400 hover:underline text-sm font-medium">
            See All
          </Link>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {lists.map((list) => (
          <div key={list.id} className="min-w-[260px] max-w-[260px] flex-shrink-0 overflow-visible">
            <ListCard list={list} readOnly={readOnly} />
          </div>
        ))}
        {/* Add New List card at the end, only if not readOnly */}
        {!readOnly && onAdd && (
          <div
            className="min-w-[260px] max-w-[260px] flex-shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-gray-500/40 light-glass dark:dark-glass rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-all p-6 group"
            onClick={onAdd}
            tabIndex={0}
            role="button"
            aria-label="Create New List"
          >
            <div className="flex items-center justify-center w-16 h-16 mb-2 rounded-full bg-gray-700/40 group-hover:bg-blue-700/60 transition-all">
              <svg className="w-10 h-10 text-blue-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            </div>
            <span className="mt-2 text-base font-semibold text-white group-hover:text-blue-400 transition-colors">Create New List</span>
          </div>
        )}
        {!readOnly && (
          <Link
            href="/lists/ready-made"
            className="min-w-[260px] max-w-[260px] flex-shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-yellow-500/40 light-glass dark:dark-glass rounded-xl shadow-md hover:shadow-lg transition-all p-6 group"
            aria-label="Ready‑Made Lists"
          >
            <div className="flex items-center justify-center w-16 h-16 mb-2 rounded-full bg-yellow-500/20 group-hover:bg-yellow-500/40 transition-all">
              <span className="text-2xl">⭐</span>
            </div>
            <span className="mt-2 text-base font-semibold text-yellow-200 group-hover:text-yellow-300 transition-colors">Ready‑Made Lists</span>
            <span className="mt-1 text-xs text-gray-300">Auto‑generated from your ratings</span>
          </Link>
        )}
      </div>
    </div>
  );
};

export default HorizontalListRow;
