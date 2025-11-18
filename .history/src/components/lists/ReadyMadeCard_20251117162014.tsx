import Image from 'next/image';
import { normalizeImageUrl } from '@/utils/imageUrl';
import Link from 'next/link';
import { ReactNode } from 'react';

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
  return (
    <div className="relative bg-gray-900/60 border border-yellow-500/20 rounded-lg h-[280px] flex flex-col overflow-visible">
      {posterUrls.length > 0 && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 h-24 w-[180px] flex items-center justify-center pointer-events-none select-none z-20">
          {posterUrls.map((url: string, i: number) => (
            <div
              key={i}
              className="absolute w-16 h-24 rounded-xl shadow-lg border-2 border-gray-800 overflow-hidden"
              style={{
                left: `calc(50% + ${(i - (posterUrls.length - 1) / 2) * 30}px - 32px)`,
                zIndex: posterUrls.length - i,
                transform: `rotate(${(i - 2) * 6}deg)`
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

      <div className="px-5 pt-14 pb-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link href={viewHref} className="block">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold truncate hover:text-yellow-200 transition-colors" title={title}>{title}</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-800 text-xs text-gray-200" title="You've seen">
                  {count}{asterisk ? '∗' : ''}
                </span>
              </div>
            </Link>
            <div className="text-sm text-gray-400">{subtitle}</div>
          </div>
          {headerRight ? (
            <div className="shrink-0">{headerRight}</div>
          ) : null}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <Link href={viewHref} className="text-sm text-yellow-300 hover:underline whitespace-nowrap">View</Link>
          {dismissForm}
        </div>
      </div>
    </div>
  );
}
