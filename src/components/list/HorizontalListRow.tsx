import React from "react";
import ListCard from "@/components/list/ListCard";
import Link from "next/link";

interface HorizontalListRowProps {
  title: string;
  lists: any[];
  seeAllHref?: string;
  readOnly?: boolean;
  onAdd?: () => void;
  headerActions?: React.ReactNode;
}

const HorizontalListRow: React.FC<HorizontalListRowProps> = ({ title, lists, seeAllHref, readOnly, onAdd, headerActions }) => {
  if (!lists || lists.length === 0) return null;
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xl font-bold text-white tracking-wide">{title}</h2>
        <div className="flex items-center gap-4">
          {headerActions && <div className="hidden md:flex items-center gap-2">{headerActions}</div>}
          {seeAllHref && (
            <Link href={seeAllHref} className="text-gold-500 hover:text-gold-400 text-sm font-medium transition-colors">
              See All
            </Link>
          )}
        </div>
      </div>
      <div className="relative overflow-visible">
        <div className="flex gap-5 overflow-x-auto pb-4 pt-4 pr-3 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {lists.map((list) => (
            <div key={list.id} className="w-[78vw] max-w-[280px] flex-shrink-0 overflow-visible snap-start">
              <ListCard list={list} readOnly={readOnly} />
            </div>
          ))}
          {/* Add New List card at the end, only if not readOnly.
              The Ready-Made Lists CTA previously lived here; it now terminates
              the Ready-Made rail on the home page where it belongs. */}
          {!readOnly && onAdd && (
            <div
              className="w-[78vw] max-w-[280px] h-[320px] flex-shrink-0 snap-start flex flex-col items-center justify-center border-2 border-dashed border-gray-700/50 bg-charcoal-900/40 hover:border-gray-600/70 hover:bg-charcoal-900/60 rounded-xl shadow-md cursor-pointer transition-all p-6 group"
              onClick={onAdd}
              tabIndex={0}
              role="button"
              aria-label="Create New List"
            >
              <div className="flex items-center justify-center w-16 h-16 mb-2 rounded-full bg-gray-700/40 group-hover:bg-gold-500/30 transition-all">
                <svg className="w-10 h-10 text-gold-500 group-hover:text-gold-300 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              </div>
              <span className="mt-2 text-base font-semibold text-white group-hover:text-gold-300 transition-colors">Create New List</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HorizontalListRow;
