import React from "react";
import ListCard from "@/components/list/ListCard";
import Link from "next/link";
import { List } from "lucide-react";

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
          <Link href={seeAllHref} className="text-[#CAAC4C] hover:text-yellow-400 text-sm font-medium transition-colors">
            See All
          </Link>
        )}
      </div>
      <div className="relative overflow-visible">
        <div className="flex gap-5 overflow-x-auto pb-4 pt-4 pr-3 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {lists.map((list) => (
            <div key={list.id} className="min-w-[280px] max-w-[280px] flex-shrink-0 overflow-visible snap-start">
              <ListCard list={list} readOnly={readOnly} />
            </div>
          ))}
          {/* Add New List card at the end, only if not readOnly */}
          {!readOnly && onAdd && (
            <div
              className="min-w-[280px] max-w-[280px] h-[320px] flex-shrink-0 snap-start flex flex-col items-center justify-center border-2 border-dashed border-gray-500/40 light-glass dark:dark-glass rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-all p-6 group"
              onClick={onAdd}
              tabIndex={0}
              role="button"
              aria-label="Create New List"
            >
              <div className="flex items-center justify-center w-16 h-16 mb-2 rounded-full bg-gray-700/40 group-hover:bg-yellow-500/30 transition-all">
                <svg className="w-10 h-10 text-[#CAAC4C] group-hover:text-yellow-300 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              </div>
              <span className="mt-2 text-base font-semibold text-white group-hover:text-yellow-300 transition-colors">Create New List</span>
            </div>
          )}
          {!readOnly && (
            <Link
              href="/lists/ready-made"
              className="min-w-[280px] max-w-[280px] h-[320px] flex-shrink-0 snap-start flex flex-col items-center justify-center border-2 border-dashed border-yellow-500/40 light-glass dark:dark-glass rounded-xl shadow-md hover:shadow-lg transition-all p-6 group"
              aria-label="Ready‑Made Lists"
            >
              <div className="flex items-center justify-center w-16 h-16 mb-2 rounded-full bg-yellow-500/20 group-hover:bg-yellow-500/40 transition-all">
                <List className="w-7 h-7 text-yellow-300" />
              </div>
              <span className="mt-2 text-base font-semibold text-yellow-200 group-hover:text-yellow-300 transition-colors">Ready‑Made Lists</span>
              <span className="mt-1 text-xs text-gray-300">Auto‑generated from your ratings</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default HorizontalListRow;
