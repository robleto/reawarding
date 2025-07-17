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
            className="min-w-[260px] max-w-[260px] flex-shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-gray-500/40 dark-glass rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-all p-6 group"
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
      </div>
    </div>
  );
};

export default HorizontalListRow;
