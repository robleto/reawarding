'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { LandingVariant } from '@/lib/landingDb';

type LandingEvent =
  | 'lp_view'
  | 'lp_scroll_50'
  | 'cta_click'
  | 'email_submitted'
  | 'step2_upload'
  | 'step2_declined';

const SESSION_KEY = 'reawarding.landing.session';
const ATTRIBUTION_KEY = 'reawarding.landing.attribution';

export interface Attribution {
  utm_source: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
}

const EMPTY: Attribution = {
  utm_source: null,
  utm_campaign: null,
  utm_content: null,
  utm_term: null,
  referrer: null,
};

/**
 * Attribution is captured once per session and stored, because it only exists
 * on the landing URL — read it fresh on a later navigation and every event
 * after the first would be attributed to nothing.
 */
function resolveAttribution(): Attribution {
  if (typeof window === 'undefined') return EMPTY;

  try {
    const stored = sessionStorage.getItem(ATTRIBUTION_KEY);
    if (stored) return { ...EMPTY, ...(JSON.parse(stored) as Partial<Attribution>) };
  } catch {
    // Private-mode sessionStorage throws. Fall through and re-read the URL.
  }

  const params = new URLSearchParams(window.location.search);
  const attribution: Attribution = {
    utm_source: params.get('utm_source'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term'),
    referrer: document.referrer || null,
  };

  try {
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    // Non-fatal: attribution still works for this pageview.
  }

  return attribution;
}

function resolveSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    // No storage (private mode / blocked): a per-mount id still lets us count
    // events, it just can't dedupe them into one session.
    return crypto.randomUUID();
  }
}

/**
 * Landing-page funnel telemetry. Fires `lp_view` on mount and `lp_scroll_50`
 * the first time half the page has been read; returns `track` for the rest.
 *
 * Every send is fire-and-forget — analytics must never be able to break the
 * page it is measuring.
 */
export function useLandingTelemetry(variant: LandingVariant) {
  const sessionIdRef = useRef<string>('');
  const attributionRef = useRef<Attribution>(EMPTY);
  const sentRef = useRef<Set<LandingEvent>>(new Set());

  if (!sessionIdRef.current && typeof window !== 'undefined') {
    sessionIdRef.current = resolveSessionId();
    attributionRef.current = resolveAttribution();
  }

  const track = useCallback(
    (event: LandingEvent) => {
      if (typeof window === 'undefined') return;
      void fetch('/api/landing/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant,
          event,
          sessionId: sessionIdRef.current,
          path: window.location.pathname,
          attribution: attributionRef.current,
        }),
        keepalive: true,
      }).catch(() => {
        /* fire-and-forget */
      });
    },
    [variant]
  );

  /** Send at most once per session — the funnel counts people, not scrolls. */
  const trackOnce = useCallback(
    (event: LandingEvent) => {
      if (sentRef.current.has(event)) return;
      sentRef.current.add(event);
      track(event);
    },
    [track]
  );

  useEffect(() => {
    trackOnce('lp_view');

    const onScroll = () => {
      const scrolled = window.scrollY + window.innerHeight;
      if (scrolled >= document.documentElement.scrollHeight * 0.5) {
        trackOnce('lp_scroll_50');
        window.removeEventListener('scroll', onScroll);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    // A short page may already satisfy the 50% test without any scrolling.
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, [trackOnce]);

  const attribution = useMemo(() => attributionRef.current, []);

  return { track, trackOnce, attribution };
}
