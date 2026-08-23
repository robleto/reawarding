'use client';

import { useEffect, useState } from 'react';
import { getActiveAwardsSeasonYear, getDaysUntilCeremony } from '@/lib/awardsSeason';

/**
 * Illustrative only. Category names are real; the counts are a plausible
 * mid-season state, not live data — nominees for the current film year aren't
 * announced until January, so there is nothing real to render yet.
 *
 * Incomplete categories sort first, which is the actual product behaviour: the
 * screen exists to surface the gap, not to celebrate the total.
 */
const CATEGORIES = [
  { name: 'Documentary Short', seen: 0, total: 5 },
  { name: 'Live Action Short', seen: 1, total: 5 },
  { name: 'Animated Short', seen: 1, total: 5 },
  { name: 'International Feature', seen: 2, total: 5 },
  { name: 'Documentary Feature', seen: 3, total: 5 },
  { name: 'Best Picture', seen: 8, total: 10 },
  { name: 'Original Screenplay', seen: 4, total: 5 },
  { name: 'Actress in a Leading Role', seen: 5, total: 5 },
  { name: 'Actor in a Leading Role', seen: 5, total: 5 },
];

export default function ReadinessMock() {
  const filmYear = getActiveAwardsSeasonYear();
  const [days, setDays] = useState<number | null>(null);

  // Computed after mount so a statically-rendered page can't ship a stale
  // countdown, and so server/client never disagree on today's date.
  useEffect(() => setDays(getDaysUntilCeremony(filmYear)), [filmYear]);

  const seen = CATEGORIES.reduce((sum, c) => sum + c.seen, 0);
  const total = CATEGORIES.reduce((sum, c) => sum + c.total, 0);
  const incomplete = CATEGORIES.filter((c) => c.seen < c.total).length;

  return (
    <div
      className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/80 shadow-2xl shadow-always-black/40"
      role="img"
      aria-label={`Preview of the readiness screen: ${seen} of ${total} nominees seen across ${CATEGORIES.length} categories, ${incomplete} still incomplete.`}
    >
      {/* Countdown — the retention hook during awards season, pinned above the list. */}
      <div className="flex items-end justify-between gap-4 border-b border-gray-800 bg-gray-950/60 px-5 py-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
            {filmYear} films · ceremony in
          </p>
          <p className="mt-1 font-mono text-4xl font-semibold leading-none text-gold-400 tabular-nums">
            {days ?? '—'}
            <span className="ml-2 font-sans text-sm font-normal text-gray-500">days</span>
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-semibold leading-none text-gray-100 tabular-nums">
            {seen}
            <span className="text-gray-600">/{total}</span>
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-gray-500">seen</p>
        </div>
      </div>

      <ul className="divide-y divide-gray-800/70">
        {CATEGORIES.map((category) => {
          const done = category.seen === category.total;
          return (
            <li
              key={category.name}
              className={`flex items-center justify-between gap-4 px-5 py-3 ${
                done ? '' : 'border-l-2 border-gold-500'
              }`}
            >
              <span className={`text-sm ${done ? 'text-gray-500' : 'text-gray-200'}`}>
                {category.name}
              </span>
              <span
                className={`font-mono text-sm tabular-nums ${
                  done ? 'text-gray-600' : 'text-gold-300'
                }`}
              >
                {category.seen} of {category.total}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="border-t border-gray-800 px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-gray-600">
        {incomplete} categories to go
      </p>
    </div>
  );
}
