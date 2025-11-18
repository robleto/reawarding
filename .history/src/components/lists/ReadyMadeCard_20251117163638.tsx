"use client";
import Image from 'next/image';
import { normalizeImageUrl } from '@/utils/imageUrl';
import Link from 'next/link';
import { ReactNode, useEffect, useRef, useState } from 'react';

export type ReadyMadeCardProps = {
  title: string;
  count: number;
  asterisk?: boolean;
  subtitle: ReactNode;
  posterUrls: string[];
  headerRight?: ReactNode; // typically the Save form/button
  viewHref: string;
  dismissForm?: ReactNode; // form node rendering the Dismiss action
};

export default function ReadyMadeCard({
  title,
  count,
  asterisk,
  subtitle,
  posterUrls,
  headerRight,
  viewHref,
  dismissForm,
}: ReadyMadeCardProps) {
  const dismissRef = useRef<HTMLDivElement | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  function confirmDismiss() {
    const form = dismissRef.current?.querySelector('form') as HTMLFormElement | null;
    if (form) {
      // Prefer requestSubmit for proper form semantics
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else {
        form.submit();
      }
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!showConfirm) return;
      if (e.key === 'Escape') {
        setShowConfirm(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showConfirm]);
  return (
    <div className="relative bg-gray-900/60 border border-yellow-500/20 rounded-lg h-[260px] flex flex-col overflow-visible mt-5">
      {posterUrls.length > 0 && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-24 w-[180px] flex items-center justify-center pointer-events-none select-none z-20">
          {posterUrls.map((url: string, i: number) => (
            <div
              key={i}
              className="absolute w-16 h-24 overflow-hidden border-2 border-gray-800 shadow-lg rounded-xl"
              style={{
                left: `calc(50% + ${(i - (posterUrls.length - 1) / 2) * 32}px - 32px)`,
                zIndex: posterUrls.length - i,
                transform: `rotate(${(i - 2) * 7}deg)`
              }}
            >
              {(() => {
                const src = normalizeImageUrl(url);
                return src ? (
                  <Image src={src} alt="Movie poster" fill className="object-cover" sizes="64px" />
                ) : (
                  <div className="w-full h-full bg-gray-700" />
                );
              })()}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col flex-1 p-6 pt-20 pb-6">
        <div className="flex items-start gap-3 mt-8 mb-2">
          <div className="flex-1 min-w-0">
            <Link href={viewHref} className="block">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold truncate transition-colors hover:text-yellow-200" title={title}>{title}</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-800 text-xs text-gray-200" title="You've seen">
                  {count}{asterisk ? '∗' : ''}
                </span>
              </div>
            </Link>
            <div className="mt-1 text-sm text-gray-400">{subtitle}</div>
          </div>
        </div>

        <div className="flex items-center mt-3">
          <div className="flex items-center gap-3">
            <Link href={viewHref} className="text-sm text-yellow-300 hover:underline whitespace-nowrap">View</Link>
            <button type="button" onClick={() => setShowConfirm(true)} className="text-sm text-gray-400 hover:text-gray-300" title="Hide this suggestion">Dismiss</button>
            {/* Hidden actual form for submission */}
            {dismissForm ? (
              <div ref={dismissRef} className="hidden">{dismissForm}</div>
            ) : null}
          </div>
          {headerRight ? (
            <div className="ml-auto shrink-0">{headerRight}</div>
          ) : null}
        </div>
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowConfirm(false)} />
            <div role="dialog" aria-modal="true" className="relative z-50 w-full max-w-sm rounded-xl bg-gray-900/80 border border-yellow-500/20 shadow-2xl backdrop-blur p-5">
              <h3 className="text-base font-semibold text-white">Hide this suggestion?</h3>
              <p className="mt-2 text-sm text-gray-300">You can still find it later under <span className="text-yellow-300">Almost Ready</span>.</p>
              <div className="mt-5 flex items-center justify-end gap-3">
                <button type="button" className="px-3 py-1.5 text-sm rounded bg-gray-700/60 text-gray-200 hover:bg-gray-700" onClick={() => setShowConfirm(false)}>Cancel</button>
                <button type="button" className="px-3 py-1.5 text-sm rounded bg-yellow-500 text-black hover:bg-yellow-400" onClick={confirmDismiss}>Hide</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
