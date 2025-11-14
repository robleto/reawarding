"use client";

import { useEffect, useRef } from "react";

interface InfiniteScrollProps {
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  threshold?: number; // Distance from bottom (in pixels) to trigger load
}

export default function InfiniteScroll({
  onLoadMore,
  hasMore,
  loading,
  threshold = 500,
}: InfiniteScrollProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || loading) return;

    const options = {
      root: null,
      rootMargin: `${threshold}px`,
      threshold: 0,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        onLoadMore();
      }
    }, options);

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, onLoadMore, threshold]);

  return (
    <div ref={sentinelRef} className="h-20 flex items-center justify-center">
      {loading && (
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading more films...</span>
        </div>
      )}
      {!hasMore && !loading && (
        <p className="text-gray-500 text-sm italic">No more films to load</p>
      )}
    </div>
  );
}
